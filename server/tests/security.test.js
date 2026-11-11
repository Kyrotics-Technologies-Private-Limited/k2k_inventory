const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

// Set testing environment flags before requiring modules
process.env.APP_ENV = 'testing';
process.env.FIREBASE_PROJECT_ID = 'univillage-testing-a640c';
process.env.FIREBASE_STORAGE_BUCKET = 'univillage-testing-a640c.firebasestorage.app';
process.env.PORT = '8089';

const {
  validateProjectIsolation,
  FORBIDDEN_PRODUCTION_ID,
  REQUIRED_TESTING_ID,
  admin,
  db,
} = require('../firebase/firebase-config');

// Mock Firestore collection calls so all unit tests run offline without network access
db.collection = (colName) => ({
  doc: (docId) => ({
    get: async () => {
      if (colName === 'admin' && docId === 'verified_firestore_admin') {
        return { exists: true, data: () => ({ role: 'admin', isAdmin: true }) };
      }
      if (colName === 'users' && docId === 'verified_firestore_admin') {
        return { exists: true, data: () => ({ role: 'admin', isAdmin: true }) };
      }
      if (colName === 'products') {
        return { exists: true, data: () => ({ name: 'Test Product', status: 'active' }) };
      }
      return { exists: false, data: () => ({}) };
    },
    set: async () => {},
    update: async () => {},
    delete: async () => {},
    collection: () => ({
      get: async () => ({ docs: [] }),
      add: async () => ({ id: 'mock_sub_id' }),
      doc: (subDocId) => ({
        id: subDocId || 'var_test_123',
        get: async () => ({
          id: subDocId || 'var_test_123',
          exists: true,
          data: () => ({ units_in_stock: 10, price: 500 }),
        }),
        update: async () => {},
        delete: async () => {},
      }),
    }),
  }),
  get: async () => ({ docs: [] }),
  where: () => ({
    get: async () => ({ docs: [] }),
  }),
  orderBy: () => ({
    get: async () => ({ docs: [] }),
  }),
  add: async () => ({ id: 'mock_doc_id' }),
});

db.collectionGroup = (groupName) => ({
  get: async () => ({
    docs: [
      {
        id: 'var_test_123',
        ref: {
          parent: {
            parent: { id: 'prod_test_456' }
          }
        },
        data: () => ({ name: '500g Jar', weight: '500g', price: 450, units_in_stock: 25 })
      }
    ]
  })
});

const firebaseAuth = require('../middleware/firebaseAuth');
const requireAdmin = require('../middleware/requireAdmin');
const app = require('../index');

// Pure in-memory HTTP simulation function (zero TCP sockets / loopback required)
function dispatch(appInstance, options) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = options.url;
    req.headers = {};
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        req.headers[k.toLowerCase()] = v;
      }
    }
    req.body = options.body || {};

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = (k, v) => {
      res._headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.send = (body) => {
      res.body = body;
      resolve({ status: res.statusCode, headers: res._headers, body });
    };
    res.json = (body) => {
      res.body = body;
      resolve({ status: res.statusCode, headers: res._headers, body });
    };
    res.end = (chunk) => {
      if (chunk) res.body = chunk;
      resolve({ status: res.statusCode, headers: res._headers, body: res.body });
    };

    appInstance.handle(req, res, (err) => {
      if (err) {
        resolve({ status: 500, headers: res._headers, error: err.message });
      } else {
        resolve({ status: 404, headers: res._headers, body: 'Not Found' });
      }
    });
  });
}

describe('PHASE 1B: Firebase Project Isolation Tests', () => {
  it('should reject missing project ID with a clear error', () => {
    assert.throws(
      () => validateProjectIsolation('', 'testing'),
      /FIREBASE_PROJECT_ID is required/
    );
    assert.throws(
      () => validateProjectIsolation(undefined, 'testing'),
      /FIREBASE_PROJECT_ID is required/
    );
  });

  it('should strictly reject production project ID in testing mode', () => {
    assert.throws(
      () => validateProjectIsolation(FORBIDDEN_PRODUCTION_ID, 'testing'),
      /Production project ID \(univillage-503009\) is strictly forbidden in testing mode/
    );
  });

  it('should reject unknown project ID in testing mode', () => {
    assert.throws(
      () => validateProjectIsolation('random-unknown-project', 'testing'),
      /Invalid Firebase project ID for testing: 'random-unknown-project'/
    );
  });

  it('should accept valid testing project ID in testing mode', () => {
    assert.doesNotThrow(() =>
      validateProjectIsolation(REQUIRED_TESTING_ID, 'testing')
    );
  });
});

describe('PHASE 1D: Firebase Authentication Middleware Tests', () => {
  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  it('should return 401 when Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await firebaseAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /No token provided/);
    assert.equal(nextCalled, false);
  });

  it('should return 401 when Authorization header is malformed', async () => {
    const req = { headers: { authorization: 'Basic 123456' } };
    const res = createMockRes();
    let nextCalled = false;

    await firebaseAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /No token provided/);
    assert.equal(nextCalled, false);
  });

  it('should return 401 when Bearer token is empty', async () => {
    const req = { headers: { authorization: 'Bearer   ' } };
    const res = createMockRes();
    let nextCalled = false;

    await firebaseAuth(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /Malformed authorization header/);
    assert.equal(nextCalled, false);
  });

  it('should return 401 when verifyIdToken rejects invalid token', async () => {
    const originalVerify = admin.auth().verifyIdToken;
    admin.auth().verifyIdToken = async () => {
      const err = new Error('Token is expired or invalid');
      err.code = 'auth/id-token-expired';
      throw err;
    };

    try {
      const req = { headers: { authorization: 'Bearer invalid.test.token' } };
      const res = createMockRes();
      let nextCalled = false;

      await firebaseAuth(req, res, () => { nextCalled = true; });

      assert.equal(res.statusCode, 401);
      assert.match(res.body.error, /Invalid or expired token/);
      assert.equal(nextCalled, false);
    } finally {
      admin.auth().verifyIdToken = originalVerify;
    }
  });

  it('should attach verified user and proceed to next() on valid token', async () => {
    const originalVerify = admin.auth().verifyIdToken;
    admin.auth().verifyIdToken = async (token) => {
      if (token === 'valid.customer.token') {
        return {
          uid: 'cust_123',
          email: 'customer@example.com',
          role: 'customer',
          isAdmin: false,
        };
      }
      throw new Error('Unexpected token');
    };

    try {
      const req = { headers: { authorization: 'Bearer valid.customer.token' } };
      const res = createMockRes();
      let nextCalled = false;

      await firebaseAuth(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(req.user.uid, 'cust_123');
      assert.equal(req.user.email, 'customer@example.com');
      assert.equal(req.user.isAdmin, false);
    } finally {
      admin.auth().verifyIdToken = originalVerify;
    }
  });
});

describe('PHASE 1E: Administrator Authorization Middleware Tests', () => {
  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  it('should return 401 if req.user is absent', async () => {
    const req = {};
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.error, /Authentication required/);
    assert.equal(nextCalled, false);
  });

  it('should immediately authorize user with role: admin custom claim', async () => {
    const req = { user: { uid: 'admin_1', role: 'admin' } };
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.user.isAdmin, true);
  });

  it('should immediately authorize user with isAdmin: true custom claim', async () => {
    const req = { user: { uid: 'admin_2', isAdmin: true } };
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.user.isAdmin, true);
  });

  it('should authorize user with verified Firestore admin record fallback', async () => {
    const req = { user: { uid: 'verified_firestore_admin' } };
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.user.isAdmin, true);
  });

  it('should return 403 Forbidden when user is a customer with no admin claims or docs', async () => {
    const req = { user: { uid: 'regular_cust', role: 'customer', isAdmin: false } };
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Administrator privileges required/);
    assert.equal(nextCalled, false);
  });
});

describe('PHASE 1F & 1H: Route Security and CORS Integration Tests', () => {
  it('GET /health should return 200 OK without authentication', async () => {
    const res = await dispatch(app, { url: '/health' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'healthy');
  });

  it('POST /api/products/create should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/products/create',
      body: { name: 'Unauthorized Product' },
    });
    assert.equal(res.status, 401);
  });

  it('PUT /api/products/123 should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'PUT',
      url: '/api/products/123',
      body: { name: 'Unauthorized Update' },
    });
    assert.equal(res.status, 401);
  });

  it('DELETE /api/products/123 should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'DELETE',
      url: '/api/products/123',
    });
    assert.equal(res.status, 401);
  });

  it('PATCH /api/products/123/status should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'PATCH',
      url: '/api/products/123/status',
      body: { status: 'hidden' },
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/variants/prod123/createVariant should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/variants/prod123/createVariant',
      body: { price: 100 },
    });
    assert.equal(res.status, 401);
  });

  it('PUT /api/variants/prod123/updateVariant/var456 should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'PUT',
      url: '/api/variants/prod123/updateVariant/var456',
      body: { units_in_stock: 0 },
    });
    assert.equal(res.status, 401);
  });

  it('DELETE /api/variants/prod123/deleteVariant/var456 should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'DELETE',
      url: '/api/variants/prod123/deleteVariant/var456',
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/dashboard/stats should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/dashboard/stats',
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/admin/users should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/users',
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/admin/customers/cust123 should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/customers/cust123',
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/admin/reports/invoices should reject unauthenticated request with 401', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/reports/invoices',
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/auth/admin/signup should reject unauthenticated self-registration with 401', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/auth/admin/signup',
      body: { email: 'hacker@test.com', name: 'Hacker', uid: 'hack123' },
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/membership should reject unauthenticated tier creation with 401', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/membership',
      body: { type: 'Free VIP', price: 0 },
    });
    assert.equal(res.status, 401);
  });

  it('CORS should allow approved testing frontend origin', async () => {
    const res = await dispatch(app, {
      url: '/health',
      headers: { Origin: 'https://univillage-inventory-testing.web.app' },
    });
    assert.equal(res.status, 200);
    assert.equal(
      res.headers['access-control-allow-origin'],
      'https://univillage-inventory-testing.web.app'
    );
  });

  it('CORS should reject or omit header for unauthorized browser origin', async () => {
    const res = await dispatch(app, {
      url: '/health',
      headers: { Origin: 'https://unauthorized-origin.com' },
    });
    assert.notEqual(
      res.headers['access-control-allow-origin'],
      'https://unauthorized-origin.com'
    );
  });
});

describe('PHASE 1G & 1J: Input Validation and Storage Safety Tests', () => {
  const variantController = require('../controllers/VariantController');
  const imageUploadController = require('../controllers/imageUploadController');

  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  it('should reject negative units_in_stock with 400', async () => {
    const req = {
      params: { productId: 'prod_1' },
      body: { units_in_stock: -10, price: 500 },
    };
    const res = createMockRes();

    await variantController.createVariant(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /non-negative integer/);
  });

  it('should reject negative price with 400', async () => {
    const req = {
      params: { productId: 'prod_1' },
      body: { units_in_stock: 5, price: -100 },
    };
    const res = createMockRes();

    await variantController.createVariant(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /price must be a non-negative number/);
  });

  it('should reject discount > 100 with 400', async () => {
    const req = {
      params: { productId: 'prod_1' },
      body: { units_in_stock: 5, discount: 150 },
    };
    const res = createMockRes();

    await variantController.createVariant(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /discount must be between 0 and 100/);
  });

  it('should return 503 when uploading images and storage bucket is unavailable', async () => {
    const req = {
      file: {
        originalname: 'test.jpg',
        buffer: Buffer.from('fake-image-bytes'),
        mimetype: 'image/jpeg',
      },
    };
    const res = createMockRes();

    await imageUploadController.uploadMainImageHandler(req, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'STORAGE_UNAVAILABLE');
    assert.match(res.body.error, /Firebase Storage is unprovisioned or unavailable/);
  });
});

describe('PHASE 2A: Advanced Authorization and Privilege Escalation Prevention Tests', () => {
  const originalVerify = admin.auth().verifyIdToken;

  before(() => {
    // Mock token verification with distinct roles
    admin.auth().verifyIdToken = async (token) => {
      if (token === 'valid.customer.token') {
        return {
          uid: 'cust_normal_123',
          email: 'customer@example.com',
          role: 'customer',
          isAdmin: false,
        };
      }
      if (token === 'valid.admin.token') {
        return {
          uid: 'admin_legit_456',
          email: 'admin@univillage.in',
          role: 'admin',
          isAdmin: true,
        };
      }
      if (token === 'attacker.token') {
        return {
          uid: 'attacker_789',
          email: 'attacker@evil.com',
          role: 'customer',
          isAdmin: false,
        };
      }
      const err = new Error('Invalid token');
      err.code = 'auth/invalid-token';
      throw err;
    };
  });

  after(() => {
    admin.auth().verifyIdToken = originalVerify;
  });

  it('valid customer token attempting product creation returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/products/create',
      headers: { authorization: 'Bearer valid.customer.token' },
      body: { name: 'Customer Attempted Product' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('valid customer token attempting stock modification returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'PUT',
      url: '/api/variants/prod123/updateVariant/var456',
      headers: { authorization: 'Bearer valid.customer.token' },
      body: { units_in_stock: 999 },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('valid customer token attempting dashboard stats access returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/dashboard/stats',
      headers: { authorization: 'Bearer valid.customer.token' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('valid customer token attempting admin creation returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/auth/admin/signup',
      headers: { authorization: 'Bearer valid.customer.token' },
      body: { email: 'newadmin@test.com', name: 'New Admin', uid: 'user999' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('valid customer token attempting admin user listing returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: 'Bearer valid.customer.token' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('valid customer token attempting another user membership returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/membership/buy',
      headers: { authorization: 'Bearer valid.customer.token' },
      body: { userId: 'victim_user_456', membershipId: 'mem_1' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Cannot buy membership for another user/);
  });

  it('user-controlled role or isAdmin body fields cannot cause privilege escalation', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/products/create',
      headers: { authorization: 'Bearer attacker.token' },
      body: {
        name: 'Escalated Product',
        role: 'admin',
        isAdmin: true,
        claims: { role: 'admin', isAdmin: true },
      },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('user with unverified profile field in users collection cannot escalate to admin', async () => {
    function createMockRes() {
      return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
      };
    }
    const req = {
      user: {
        uid: 'user_with_self_written_isAdmin_in_users_collection',
        role: 'customer',
        isAdmin: false,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await requireAdmin(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.error, /Administrator privileges required/);
  });

  it('legitimate verified administrator can access authorized admin routes', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: 'Bearer valid.admin.token' },
    });
    assert.equal(res.status, 200);
  });

  it('sensitive authentication failures never expose secrets or raw tokens', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/products/create',
      headers: { authorization: 'Bearer super-secret-internal-key-12345' },
    });
    assert.equal(res.status, 401);
    assert.doesNotMatch(JSON.stringify(res.body), /super-secret-internal-key/);
  });
});

describe('PHASE 4: Variant Route and Schema Integration Tests', () => {
  it('GET /api/variants/:variantId should resolve variant by ID across subcollections', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/variants/var_test_123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'var_test_123');
    assert.equal(res.body.productId, 'prod_test_456');
    assert.equal(res.body.weight, '500g');
    assert.equal(res.body.price, 450);
  });

  it('GET /api/variants/:variantId should return 404 if variant does not exist', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/variants/non_existent_var',
    });
    assert.equal(res.status, 404);
    assert.match(res.body.error, /Variant not found/);
  });

  it('GET /api/variants/:productId/getVariant/:variantId should resolve subcollection variant', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/variants/prod_test_456/getVariant/var_test_123',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'var_test_123');
  });
});

describe('PHASE 5: Order Lifecycle, Restocking Idempotency, and Commerce Security Tests', () => {
  const originalVerify = admin.auth().verifyIdToken;

  before(() => {
    admin.auth().verifyIdToken = async (token) => {
      if (token === 'valid.customer.token') {
        return {
          uid: 'cust_normal_123',
          email: 'customer@example.com',
          role: 'customer',
          isAdmin: false,
        };
      }
      if (token === 'valid.admin.token') {
        return {
          uid: 'admin_legit_456',
          email: 'admin@univillage.in',
          role: 'admin',
          isAdmin: true,
        };
      }
      const err = new Error('Invalid token');
      err.code = 'auth/invalid-token';
      throw err;
    };
  });

  after(() => {
    admin.auth().verifyIdToken = originalVerify;
  });

  it('GET /api/orders requires authentication and returns 401 when unauthenticated', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/orders',
    });
    assert.equal(res.status, 401);
  });

  it('PATCH /api/orders/:orderId/status requires authentication and returns 401 when unauthenticated', async () => {
    const res = await dispatch(app, {
      method: 'PATCH',
      url: '/api/orders/order_test_123/status',
      body: { status: 'Delivered' },
    });
    assert.equal(res.status, 401);
  });

  it('PATCH /api/orders/:orderId/status with customer token returns 403 Forbidden', async () => {
    const res = await dispatch(app, {
      method: 'PATCH',
      url: '/api/orders/order_test_123/status',
      headers: { authorization: 'Bearer valid.customer.token' },
      body: { status: 'Delivered' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error, /Administrator privileges required/i);
  });

  it('POST /api/orders/create requires authentication and returns 401 when unauthenticated', async () => {
    const res = await dispatch(app, {
      method: 'POST',
      url: '/api/orders/create',
      body: { items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }] },
    });
    assert.equal(res.status, 401);
  });

  it('GET /api/catalog/manifest returns 200 with valid manifest schema', async () => {
    const res = await dispatch(app, {
      method: 'GET',
      url: '/api/catalog/manifest',
    });
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.version === 'number');
    assert.ok(Array.isArray(res.body.menuCategories));
  });
});

