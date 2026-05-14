const { auth, db } = require('./firebase/firebase-config');

const ADMIN_COLLECTION = 'admin';

async function registerAdmin() {
  const adminData = {
    email: 'admin@gmail.com',
    password: '123456',
    displayName: 'k2kadmin',
  };

  try {
    console.log(`Checking if user with email ${adminData.email} already exists...`);
    
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminData.email);
      console.log('User already exists in Firebase Auth.');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Creating new user in Firebase Auth...');
        userRecord = await auth.createUser({
          email: adminData.email,
          password: adminData.password,
          displayName: adminData.displayName,
        });
        console.log('Successfully created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    console.log('Updating/Creating record in Firestore...');
    await db.collection(ADMIN_COLLECTION).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      name: adminData.displayName,
      createdAt: new Date().toISOString(),
      role: 'admin'
    });

    console.log('Admin record successfully registered in Firestore.');
    process.exit(0);
  } catch (error) {
    console.error('Error registering admin:', error);
    process.exit(1);
  }
}

registerAdmin();
