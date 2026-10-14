const { auth, db } = require('./firebase/firebase-config');

const ADMIN_COLLECTION = 'admin';
const USERS_COLLECTION = 'users';

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDjkP-tGq35uKry6PtQ3nVQmq3Yg_DgyM0';

async function registerAdmin() {
  const adminData = {
    email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.ADMIN_PASSWORD || '123456',
    displayName: 'k2kadmin',
  };

  try {
    console.log(`Checking if user with email ${adminData.email} already exists...`);

    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminData.email);
      console.log(`User already exists in Firebase Auth (UID: ${userRecord.uid}). Updating credentials...`);
      userRecord = await auth.updateUser(userRecord.uid, {
        password: adminData.password,
        displayName: adminData.displayName,
        emailVerified: true,
        disabled: false,
      });
      console.log('Password and profile successfully updated in Firebase Auth.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Creating new user in Firebase Auth...');
        userRecord = await auth.createUser({
          email: adminData.email,
          password: adminData.password,
          displayName: adminData.displayName,
          emailVerified: true,
          disabled: false,
        });
        console.log('Successfully created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    const now = new Date().toISOString();

    // 1. Set Custom Claims for Traceability & Token verification
    console.log('Setting custom user claims (role: "admin", isAdmin: true)...');
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      isAdmin: true,
    });

    // 2. Update Firestore 'admin' collection (used by Inventory authController)
    console.log(`Updating Firestore collection '${ADMIN_COLLECTION}/${userRecord.uid}'...`);
    await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        name: adminData.displayName,
        role: 'admin',
        isAdmin: true,
        updatedAt: now,
      },
      { merge: true }
    );

    // 3. Update Firestore 'users' collection (used by Inventory requireAdmin & Traceability)
    console.log(`Updating Firestore collection '${USERS_COLLECTION}/${userRecord.uid}'...`);
    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: userRecord.email,
        name: adminData.displayName,
        role: 'admin',
        isAdmin: true,
        updatedAt: now,
      },
      { merge: true }
    );

    console.log('Verifying login via Firebase REST API...');
    try {
      const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminData.email,
            password: adminData.password,
            returnSecureToken: true,
          }),
        }
      );
      const data = await resp.json();
      if (resp.ok && data.idToken) {
        console.log('Verification SUCCESS: signInWithPassword returned 200 OK with valid idToken.');
      } else {
        console.warn('Verification WARNING: Response from identitytoolkit:', data);
      }
    } catch (testErr) {
      console.warn('Verification network test failed:', testErr.message);
    }

    console.log('\n=============================================');
    console.log('Admin account configured successfully for both:');
    console.log('  1. Inventory System (k2k_inventory)');
    console.log('  2. Traceability System (k2k_traceability)');
    console.log(`Email:    ${adminData.email}`);
    console.log(`Password: ${adminData.password}`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error configuring admin user:', error);
    process.exit(1);
  }
}

registerAdmin();
