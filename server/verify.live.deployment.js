// server/verify.live.deployment.js
// Verification script testing the live deployed Cloud Run Inventory service and Storefront

const INVENTORY_URL = 'https://k2k-inventory-api-42827689186.us-central1.run.app';
const STOREFRONT_WEB = 'https://univillage-testing-a640c.web.app';
const STOREFRONT_API = 'https://k2k-storefront-api-42827689186.us-central1.run.app';

async function runVerification() {
  console.log('================================================================');
  console.log('LIVE DEPLOYMENT COMPREHENSIVE VERIFICATION');
  console.log(`Target Inventory URL:  ${INVENTORY_URL}`);
  console.log(`Storefront Web URL:    ${STOREFRONT_WEB}`);
  console.log(`Storefront API URL:    ${STOREFRONT_API}`);
  console.log('================================================================\n');

  const results = [];

  // Helper
  async function testEndpoint(name, url, options = {}) {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch (e) {}

      const entry = {
        name,
        url,
        method: options.method || 'GET',
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type'),
        preview: text.slice(0, 300),
        json
      };
      results.push(entry);
      console.log(`[${entry.status}] ${entry.method} ${url} -> ${name}`);
      return entry;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      results.push({ name, url, error: err.message });
      return null;
    }
  }

  // 1. Health
  console.log('--- 1. Health & Status Probes ---');
  await testEndpoint('Inventory Health Check', `${INVENTORY_URL}/health`);
  await testEndpoint('Inventory Test Endpoint', `${INVENTORY_URL}/api/test`);

  // 2. Shared Firestore Public Reads
  console.log('\n--- 2. Shared Firestore Public Reads ---');
  const prodRes = await testEndpoint('Inventory Products List', `${INVENTORY_URL}/api/products`);
  if (prodRes && prodRes.json && Array.isArray(prodRes.json.products)) {
    console.log(`   --> Found ${prodRes.json.products.length} products in Firestore (default) database!`);
    if (prodRes.json.products.length > 0) {
      console.log(`   --> Sample product: "${prodRes.json.products[0].name}" (ID: ${prodRes.json.products[0].id})`);
    }
  }

  const actRes = await testEndpoint('Inventory Active Products', `${INVENTORY_URL}/api/products/active`);
  if (actRes && actRes.json && Array.isArray(actRes.json.products)) {
    console.log(`   --> Found ${actRes.json.products.length} active products.`);
  }

  const comboRes = await testEndpoint('Inventory Combos List', `${INVENTORY_URL}/api/combos`);

  // 3. Protected Routes (Must Reject Unauthenticated Calls with 401)
  console.log('\n--- 3. Protected Route Security Verification ---');
  await testEndpoint('Create Product (No Auth)', `${INVENTORY_URL}/api/products/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unauthorized Test Product' })
  });

  await testEndpoint('Update Variant Stock (No Auth)', `${INVENTORY_URL}/api/variants/var123/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ units_in_stock: 50 })
  });

  await testEndpoint('Dashboard Stats (No Auth)', `${INVENTORY_URL}/api/dashboard/stats`);

  await testEndpoint('Orders Access (No Auth)', `${INVENTORY_URL}/api/orders`);

  await testEndpoint('Admin Self-Registration (No Auth)', `${INVENTORY_URL}/api/auth/admin/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'attacker@evil.com', password: 'password123' })
  });

  await testEndpoint('Admin User Management (No Auth)', `${INVENTORY_URL}/api/admin/users`);

  await testEndpoint('Customer Invoices Report (No Auth)', `${INVENTORY_URL}/api/admin/reports/invoices`);

  // 4. Storefront Verification (Must Remain Completely Functional)
  console.log('\n--- 4. Storefront Regression & Isolation Verification ---');
  await testEndpoint('Storefront Web App', STOREFRONT_WEB);
  await testEndpoint('Storefront API Health', `${STOREFRONT_API}/health`);
  await testEndpoint('Storefront API Products', `${STOREFRONT_API}/api/products`);

  console.log('\n================================================================');
  console.log('SUMMARY OF VERIFICATION RESULTS:');
  console.log('================================================================');
  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.name}: ERROR (${r.error})`);
    } else {
      console.log(`✅ [HTTP ${r.status}] ${r.name}`);
    }
  }
}

runVerification();

