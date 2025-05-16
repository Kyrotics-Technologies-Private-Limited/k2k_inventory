// firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Optional: reCAPTCHA Enterprise (commented unless you're using it)
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Optional: reCAPTCHA Enterprise (Uncomment if using App Check)
/*
try {
  if (typeof window !== "undefined" && (window as any).grecaptcha) {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("App Check initialized with reCAPTCHA Enterprise.");
  } else {
    console.warn("grecaptcha not defined. Make sure reCAPTCHA script is loaded.");
  }
} catch (error) {
  console.error("Error initializing App Check:", error);
}
*/

export { app, analytics, auth, db, storage };
