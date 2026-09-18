// firebase-config.js
const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../config.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  (projectId ? `${projectId}.firebasestorage.app` : undefined);

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      projectId,
      storageBucket,
    });
    console.log(`Firebase Admin initialized with service account for ${projectId}`);
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
      storageBucket,
    });
    console.log(`Firebase Admin initialized with ADC for ${projectId}`);
  }
}

// Export Firestore, Auth, and Storage
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const FieldValue = admin.firestore.FieldValue;
const bucket = storage.bucket();

module.exports = {
  admin,
  db,
  auth,
  storage,
  bucket,
  FieldValue
};

