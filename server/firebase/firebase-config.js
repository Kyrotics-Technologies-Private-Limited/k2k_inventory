// firebase-config.js
const admin = require("firebase-admin");
const path = require("path");

const FORBIDDEN_PRODUCTION_ID = "univillage-503009";
const REQUIRED_TESTING_ID = "univillage-testing-a640c";

// Fail-closed project isolation validation function
function validateProjectIsolation(pId, appEnv) {
  if (!pId) {
    throw new Error("FIREBASE_PROJECT_ID is required and was not provided.");
  }
  if (appEnv === "testing") {
    if (pId === FORBIDDEN_PRODUCTION_ID) {
      throw new Error(
        `FATAL: Production project ID (${FORBIDDEN_PRODUCTION_ID}) is strictly forbidden in testing mode.`
      );
    }
    if (pId !== REQUIRED_TESTING_ID) {
      throw new Error(
        `FATAL: Invalid Firebase project ID for testing: '${pId}'. Expected '${REQUIRED_TESTING_ID}'.`
      );
    }
  }
}

// In testing mode, NEVER load server/config.env to prevent production contamination
if (process.env.APP_ENV !== "testing" && !process.env.FIREBASE_PROJECT_ID) {
  require("dotenv").config({ path: path.join(__dirname, "../config.env") });
}

const projectId = process.env.FIREBASE_PROJECT_ID;

// Validate immediately on module load
validateProjectIsolation(projectId, process.env.APP_ENV);

const storageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  (projectId ? `${projectId}.firebasestorage.app` : undefined);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const hasPrivateKey = Boolean(
    process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL
  );

  const credential = hasPrivateKey
    ? admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        project_id: projectId,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
      })
    : admin.credential.applicationDefault();

  const initConfig = {
    credential,
    projectId,
  };

  if (storageBucket) {
    initConfig.storageBucket = storageBucket;
  }

  admin.initializeApp(initConfig);

  console.log(
    `Firebase Admin initialized with ${hasPrivateKey ? "service account cert" : "ADC"} for project: ${projectId}`
  );
}

// Export Firestore, Auth, and Storage
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const FieldValue = admin.firestore.FieldValue;

// Safeguard bucket instantiation
let bucket = null;
try {
  bucket = storageBucket ? storage.bucket(storageBucket) : storage.bucket();
} catch (err) {
  console.warn("Storage bucket initialization warning:", err.message);
}

module.exports = {
  admin,
  db,
  auth,
  storage,
  bucket,
  FieldValue,
  validateProjectIsolation,
  FORBIDDEN_PRODUCTION_ID,
  REQUIRED_TESTING_ID,
};



