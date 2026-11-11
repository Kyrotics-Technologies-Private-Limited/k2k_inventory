// client/verify.live.frontend.js
// Comprehensive Phase 3 live end-to-end verification script

const FRONTEND_WEB_URL = 'https://univillage-inventory-testing.web.app';
const FRONTEND_FB_URL = 'https://univillage-inventory-testing.firebaseapp.com';
const BACKEND_API_URL = 'https://k2k-inventory-api-42827689186.us-central1.run.app';
const STOREFRONT_WEB_URL = 'https://univillage-testing-a640c.web.app';
const STOREFRONT_API_URL = 'https://k2k-storefront-api-42827689186.us-central1.run.app';

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('PHASE 3 LIVE END-TO-END DEPLOYMENT VERIFICATION');
  console.log(`Inventory Frontend URL:  ${FRONTEND_WEB_URL}`);
  console.log(`Inventory Backend URL:   ${BACKEND_API_URL}`);
  console.log(`Storefront Web URL:      ${STOREFRONT_WEB_URL}`);
  console.log('================================================================\n');

  const checklist = [];

  function record(item, status, details) {
    checklist.push({ item, status, details });
    const mark = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
    console.log(`${mark} [${status}] ${item}: ${details}`);
  }

  // 1. Frontend Web App Availability
  try {
    const res = await fetch(FRONTEND_WEB_URL);
    const text = await res.text();
    const cacheControl = res.headers.get('cache-control') || 'none';
    if (res.status === 200 && text.includes('<html')) {
      record('Frontend Root Route', 'PASS', `HTTP 200, HTML body served, Cache-Control: ${cacheControl}`);
    } else {
      record('Frontend Root Route', 'FAIL', `HTTP ${res.status}`);
    }
  } catch (err) {
    record('Frontend Root Route', 'FAIL', err.message);
  }

  // 2. SPA Route Refresh (/admin/login)
  try {
    const res = await fetch(`${FRONTEND_WEB_URL}/admin/login`);
    const text = await res.text();
    if (res.status === 200 && text.includes('<div id="root">')) {
      record('SPA Route Fallback (/admin/login)', 'PASS', `HTTP 200, successfully rewrites to /index.html`);
    } else {
      record('SPA Route Fallback (/admin/login)', 'FAIL', `HTTP ${res.status}`);
    }
  } catch (err) {
    record('SPA Route Fallback (/admin/login)', 'FAIL', err.message);
  }

  // 3. Alternative Hosting Domain (.firebaseapp.com)
  try {
    const res = await fetch(FRONTEND_FB_URL);
    if (res.status === 200) {
      record('Secondary Domain (.firebaseapp.com)', 'PASS', `HTTP 200 OK`);
    } else {
      record('Secondary Domain (.firebaseapp.com)', 'WARN', `HTTP ${res.status}`);
    }
  } catch (err) {
    record('Secondary Domain (.firebaseapp.com)', 'WARN', err.message);
  }

  // 4. Live Bundle Verification (from actual CDN)
  try {
    const rootRes = await fetch(FRONTEND_WEB_URL);
    const rootHtml = await rootRes.text();
    const scriptMatch = rootHtml.match(/src="(\/assets\/[^"]+\.js)"/);
    if (scriptMatch) {
      const assetUrl = `${FRONTEND_WEB_URL}${scriptMatch[1]}`;
      const assetRes = await fetch(assetUrl);
      const assetJs = await assetRes.text();
      const assetCache = assetRes.headers.get('cache-control');

      const hasTestingProj = assetJs.includes('univillage-testing-a640c');
      const hasCloudRun = assetJs.includes('https://k2k-inventory-api-42827689186.us-central1.run.app');
      const hasProdProj = assetJs.includes('univillage-503009');
      const hasRender = assetJs.includes('onrender.com');

      if (hasTestingProj && hasCloudRun && !hasProdProj && !hasRender) {
        record('CDN Bundle Integrity', 'PASS', `Testing project embedded, Cloud Run URL embedded, 0 prod leaks, Cache-Control: ${assetCache}`);
      } else {
        record('CDN Bundle Integrity', 'FAIL', `Mismatch in bundle contents! Testing: ${hasTestingProj}, CloudRun: ${hasCloudRun}, Prod: ${hasProdProj}`);
      }
    } else {
      record('CDN Bundle Integrity', 'FAIL', 'Could not locate script tag in index.html');
    }
  } catch (err) {
    record('CDN Bundle Integrity', 'FAIL', err.message);
  }

  // 5. Backend CORS Preflight from Inventory Frontend Origin
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/products`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_WEB_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (allowOrigin === FRONTEND_WEB_URL || allowOrigin === '*') {
      record('Backend CORS Allowlist', 'PASS', `Access-Control-Allow-Origin: ${allowOrigin}`);
    } else {
      record('Backend CORS Allowlist', 'FAIL', `Missing or incorrect CORS header: ${allowOrigin}`);
    }
  } catch (err) {
    record('Backend CORS Allowlist', 'FAIL', err.message);
  }

  // 6. Backend Firestore Public Catalog Read
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/products`, {
      headers: { 'Origin': FRONTEND_WEB_URL }
    });
    const prods = await res.json();
    if (res.status === 200 && Array.isArray(prods)) {
      record('Backend Firestore Catalog Read', 'PASS', `HTTP 200, returned ${prods.length} products (shared testing Firestore)`);
    } else {
      record('Backend Firestore Catalog Read', 'FAIL', `HTTP ${res.status}`);
    }
  } catch (err) {
    record('Backend Firestore Catalog Read', 'FAIL', err.message);
  }

  // 7. Security: Unauthenticated Admin Write Rejection
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/products/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': FRONTEND_WEB_URL },
      body: JSON.stringify({ name: 'Hacker Product' })
    });
    if (res.status === 401) {
      record('Protected Route Security (POST /create)', 'PASS', `HTTP 401 Unauthorized (correctly rejected)`);
    } else {
      record('Protected Route Security (POST /create)', 'FAIL', `Unexpected status HTTP ${res.status}`);
    }
  } catch (err) {
    record('Protected Route Security (POST /create)', 'FAIL', err.message);
  }

  // 8. Security: Unauthenticated Dashboard Access Rejection
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/dashboard/stats`, {
      headers: { 'Origin': FRONTEND_WEB_URL }
    });
    if (res.status === 401) {
      record('Protected Route Security (GET /dashboard/stats)', 'PASS', `HTTP 401 Unauthorized (correctly rejected)`);
    } else {
      record('Protected Route Security (GET /dashboard/stats)', 'FAIL', `Unexpected status HTTP ${res.status}`);
    }
  } catch (err) {
    record('Protected Route Security (GET /dashboard/stats)', 'FAIL', err.message);
  }

  // 9. Storefront Non-Interference
  try {
    const sfWeb = await fetch(STOREFRONT_WEB_URL);
    const sfApi = await fetch(`${STOREFRONT_API_URL}/health`);
    const sfApiJson = await sfApi.json();
    if (sfWeb.status === 200 && sfApi.status === 200 && sfApiJson.status === 'healthy') {
      record('Storefront Isolation & Integrity', 'PASS', `Storefront Web HTTP 200, Storefront API HTTP 200 healthy`);
    } else {
      record('Storefront Isolation & Integrity', 'FAIL', `Web: ${sfWeb.status}, API: ${sfApi.status}`);
    }
  } catch (err) {
    record('Storefront Isolation & Integrity', 'FAIL', err.message);
  }

  console.log('\n================================================================');
  console.log('FINAL VERIFICATION SUMMARY:');
  const passes = checklist.filter(c => c.status === 'PASS').length;
  const fails = checklist.filter(c => c.status === 'FAIL').length;
  console.log(`Total Checks: ${checklist.length} | Passed: ${passes} | Failed: ${fails}`);
  console.log('================================================================');
}

runEndToEndVerification();

