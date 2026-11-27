/**
 * server/scripts/updateAdminEmail.js
 *
 * Configures both:
 *   1. Inventory Management System (k2k_inventory)
 *   2. Traceability System (k2k_traceability)
 *
 * Supported environments:
 *   - testing    -> Project: univillage-testing-a640c
 *   - production -> Project: univillage-503009
 *   - all / both -> Runs for testing, then production
 *
 * Usage:
 *   node server/scripts/updateAdminEmail.js testing
 *   node server/scripts/updateAdminEmail.js production
 *   node server/scripts/updateAdminEmail.js all
 */

const path = require('path');
const https = require('https');
const admin = require(path.resolve(__dirname, '../node_modules/firebase-admin'));

const NEW_ADMIN_EMAIL = process.env.NEW_ADMIN_EMAIL;
const OLD_ADMIN_EMAIL = process.env.OLD_ADMIN_EMAIL;
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD;
const ADMIN_NAME      = process.env.ADMIN_NAME      || 'k2kadmin';

const ENVIRONMENTS = {
  testing: {
    projectId: 'univillage-testing-a640c',
    apiKey: process.env.TESTING_WEB_API_KEY,
    apiKeyVariable: 'TESTING_WEB_API_KEY',
    label: 'Testing Environment',
  },
  production: {
    projectId: 'univillage-503009',
    apiKey: process.env.PRODUCTION_WEB_API_KEY,
    apiKeyVariable: 'PRODUCTION_WEB_API_KEY',
    label: 'Production Environment',
  },
};

function validateInputs(environments) {
  const keys = ['NEW_ADMIN_EMAIL', 'OLD_ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  keys.push(...environments.map((mode) => ENVIRONMENTS[mode].apiKeyVariable));
  const missing = keys.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required variables: ${missing.join(', ')}`);
}

/**
 * Verify sign-in using Firebase Identity Toolkit REST API
 */
function verifySignIn(apiKey, email, password) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200 && parsed.idToken) {
            resolve({ success: true, localId: parsed.localId, idToken: parsed.idToken });
          } else {
            resolve({ success: false, error: 'Firebase sign-in failed', statusCode: res.statusCode });
          }
        } catch (e) {
          resolve({ success: false, error: 'Invalid Firebase sign-in response' });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

/**
 * Update or provision admin account for a specific project
 */
async function processEnvironment(envKey) {
  const envConfig = ENVIRONMENTS[envKey];
  if (!envConfig) {
    throw new Error(`Unknown environment: '${envKey}'. Allowed: testing, production, all`);
  }
  validateInputs([envKey]);

  const { projectId, apiKey, label } = envConfig;

  console.log('\n================================================================');
  console.log(`  Processing ${label} [${projectId}]`);
  console.log(`  Target Admin: ${NEW_ADMIN_EMAIL}`);
  console.log('================================================================');

  // Initialize a scoped Firebase Admin app for this project
  const appName = `admin-updater-${projectId}-${Date.now()}`;
  const app = admin.initializeApp(
    {
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    },
    appName
  );

  const auth = app.auth();
  const db = app.firestore();

  try {
    let userRecord = null;
    let actionTaken = '';

    // Step 1: Check if new email already exists in Firebase Auth
    try {
      userRecord = await auth.getUserByEmail(NEW_ADMIN_EMAIL);
      console.log(`[AUTH] User '${NEW_ADMIN_EMAIL}' already exists in Firebase Auth (UID: ${userRecord.uid}).`);
      console.log('[AUTH] Updating password and profile...');
      userRecord = await auth.updateUser(userRecord.uid, {
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
        disabled: false,
      });
      actionTaken = 'Updated existing account';
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Step 2: If new email does not exist, check if old email exists and rename it
    if (!userRecord) {
      try {
        const oldUser = await auth.getUserByEmail(OLD_ADMIN_EMAIL);
        console.log(`[AUTH] Found legacy user '${OLD_ADMIN_EMAIL}' (UID: ${oldUser.uid}).`);
        console.log(`[AUTH] Migrating email '${OLD_ADMIN_EMAIL}' -> '${NEW_ADMIN_EMAIL}'...`);
        userRecord = await auth.updateUser(oldUser.uid, {
          email: NEW_ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_NAME,
          emailVerified: true,
          disabled: false,
        });
        actionTaken = `Migrated from ${OLD_ADMIN_EMAIL} (preserved UID: ${userRecord.uid})`;
      } catch (err) {
        if (err.code !== 'auth/user-not-found') throw err;
      }
    }

    // Step 3: If neither exists, create fresh user
    if (!userRecord) {
      console.log(`[AUTH] Neither '${NEW_ADMIN_EMAIL}' nor '${OLD_ADMIN_EMAIL}' exists. Creating new user...`);
      userRecord = await auth.createUser({
        email: NEW_ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
        disabled: false,
      });
      actionTaken = `Created new user (UID: ${userRecord.uid})`;
    }

    console.log(`[AUTH OK] ${actionTaken}`);

    // Step 4: Set Custom User Claims for Token Verification (Used by Inventory & Traceability)
    console.log('[CLAIMS] Setting custom claims: { role: "admin", isAdmin: true }...');
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isAdmin: true,
    });
    console.log('[CLAIMS OK] Custom claims successfully set.');

    const now = new Date().toISOString();

    // Step 5: Update Firestore 'admin' collection (used by Inventory authController & requireAdmin)
    console.log(`[FIRESTORE] Updating 'admin/${userRecord.uid}'...`);
    await db.collection('admin').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: NEW_ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'admin',
        isAdmin: true,
        updatedAt: now,
      },
      { merge: true }
    );

    // Also update any legacy documents in 'admin' where email was old email
    const legacyAdminSnap = await db.collection('admin').where('email', '==', OLD_ADMIN_EMAIL).get();
    for (const doc of legacyAdminSnap.docs) {
      if (doc.id !== userRecord.uid) {
        console.log(`[FIRESTORE] Updating legacy admin record '${doc.id}' email to '${NEW_ADMIN_EMAIL}'...`);
        await doc.ref.update({
          email: NEW_ADMIN_EMAIL,
          updatedAt: now,
        });
      }
    }
    console.log('[FIRESTORE OK] Collection "admin" synchronized.');

    // Step 6: Update Firestore 'users' collection (used by Traceability & user profile lookups)
    console.log(`[FIRESTORE] Updating 'users/${userRecord.uid}'...`);
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: NEW_ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'admin',
        isAdmin: true,
        updatedAt: now,
      },
      { merge: true }
    );

    // Also update any legacy documents in 'users' where email was old email
    const legacyUsersSnap = await db.collection('users').where('email', '==', OLD_ADMIN_EMAIL).get();
    for (const doc of legacyUsersSnap.docs) {
      if (doc.id !== userRecord.uid) {
        console.log(`[FIRESTORE] Updating legacy user record '${doc.id}' email to '${NEW_ADMIN_EMAIL}'...`);
        await doc.ref.update({
          email: NEW_ADMIN_EMAIL,
          updatedAt: now,
        });
      }
    }
    console.log('[FIRESTORE OK] Collection "users" synchronized.');

    // Step 7: Verify Authentication via REST API
    console.log('[VERIFY] Testing live sign-in via Firebase Identity Toolkit...');
    const verifyResult = await verifySignIn(apiKey, NEW_ADMIN_EMAIL, ADMIN_PASSWORD);
    if (verifyResult.success) {
      console.log(`[VERIFY OK] Sign-in verified successfully! Returned UID: ${verifyResult.localId}`);
    } else {
      console.warn(`[VERIFY WARNING] REST sign-in check failed: ${verifyResult.error}`);
    }

    console.log('----------------------------------------------------------------');
    console.log(`[COMPLETED] ${label} successfully configured!`);
    console.log(`  Email:       ${NEW_ADMIN_EMAIL}`);
    console.log(`  UID:         ${userRecord.uid}`);
    console.log('  Systems:     Inventory (k2k_inventory) & Traceability (k2k_traceability)');
    console.log('----------------------------------------------------------------\n');

    return { success: true, projectId, uid: userRecord.uid };
  } catch (error) {
    console.error(`[ERROR] Failed to process ${label} [${projectId}]:`, error.message);
    throw error;
  } finally {
    // Clean up scoped app
    try {
      await app.delete();
    } catch (_) {}
  }
}

async function main() {
  const arg = (process.argv[2] || 'testing').toLowerCase().replace(/^--?env=/, '');

  console.log('################################################################');
  console.log('#   Univillage Admin Email & Password Configuration Tool       #');
  console.log('################################################################');

  if (arg === 'all' || arg === 'both') {
    validateInputs(['testing', 'production']);
    console.log('[MODE] Running for BOTH Testing and Production environments...\n');
    await processEnvironment('testing');
    await processEnvironment('production');
  } else if (arg === 'testing' || arg === 'test') {
    console.log('[MODE] Running for TESTING environment only...\n');
    await processEnvironment('testing');
  } else if (arg === 'production' || arg === 'prod') {
    console.log('[MODE] Running for PRODUCTION environment only...\n');
    await processEnvironment('production');
  } else {
    console.error(`[FATAL] Invalid target environment: '${arg}'.`);
    console.error('Usage:');
    console.error('  node server/scripts/updateAdminEmail.js testing');
    console.error('  node server/scripts/updateAdminEmail.js production');
    console.error('  node server/scripts/updateAdminEmail.js all');
    process.exit(1);
  }

  console.log('\n[ALL DONE] Admin credentials have been configured successfully.');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('\n[FATAL ERROR]:', err);
    process.exit(1);
  });
}

module.exports = { processEnvironment, verifySignIn, ENVIRONMENTS };
