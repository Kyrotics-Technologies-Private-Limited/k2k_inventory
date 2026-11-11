# Univillage Inventory Frontend — Phase 3 Firebase Hosting Deployment Report

**Document ID:** `INVENTORY-PHASE3-DEPLOYMENT-REPORT`  
**Execution Timestamp:** 2026-11-11T13:00:00+05:30  
**Target Environment:** Testing (`univillage-testing-a640c`)  
**Frontend Hosting Site ID:** `univillage-inventory-testing`  
**Frontend Live URL:** `https://univillage-inventory-testing.web.app`  
**Secondary Hosting URL:** `https://univillage-inventory-testing.firebaseapp.com`  
**Backend API URL:** `https://k2k-inventory-api-42827689186.us-central1.run.app`  
**Storefront Isolation Status:** Verified Untouched & Operational (`https://univillage-testing-a640c.web.app`)  
**Production Restriction Status:** Strictly Enforced (Zero interaction with `univillage-503009`)

---

## 1. Executive Summary

Phase 3 of the Univillage Inventory deployment is **successfully completed**. The React 19 / Vite / TypeScript Inventory frontend has been built, tested, and deployed to a dedicated Firebase Hosting site (`univillage-inventory-testing`) within the testing project `univillage-testing-a640c`.

The frontend is fully integrated with the Phase 2 Google Cloud Run backend (`k2k-inventory-api`), shares the same testing Firebase Authentication user base, and reads from the shared Firestore database `(default)` alongside the existing Storefront without interference.

---

## 2. Existing Backend Verification

Before frontend deployment, the Phase 2 Cloud Run service was independently verified:
- **Service Name:** `k2k-inventory-api`
- **Region:** `us-central1`
- **Live Health Endpoint:** `https://k2k-inventory-api-42827689186.us-central1.run.app/health` returned `HTTP 200 OK` (`{"status":"healthy","env":"testing"}`).
- **Catalog Read:** `GET /api/products` returned `HTTP 200 OK` with 2 live product records from Firestore `(default)`.
- **Attached Service Account:** `k2k-inventory-backend@univillage-testing-a640c.iam.gserviceaccount.com` using Application Default Credentials (ADC).
- **Log Verification:** Cloud Run logs confirm zero credential errors and normal request handling.

---

## 3. Frontend Repository Audit

The `client/` directory was audited prior to modifications:
- **Framework:** React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, React Router 7.
- **Vite Build Command:** `tsc -b && vite build --mode testing`.
- **Output Directory:** `client/dist`.
- **Finding:** Prior to Phase 3, `client/.env` and `client/.env.production` contained hardcoded production references (`univillage-503009` and `univillage-admin-backend-hdnhw5l6lq-uc.a.run.app`). Neither `firebase.json`, `.firebaserc`, nor `.env.testing` existed.
- **Routing:** SPA routing handled via React Router with `<ProtectedRoute>` requiring both Firebase authentication and a verified administrator token.

---

## 4. Firebase Hosting Site Creation or Reuse

- **Pre-check:** Executed `firebase hosting:sites:list --project univillage-testing-a640c`. Only `univillage-testing-a640c` (the Storefront site) existed.
- **Site Creation:** Created the new dedicated Hosting site:
  ```bash
  firebase hosting:sites:create univillage-inventory-testing --project univillage-testing-a640c
  ```
- **Storefront Safety:** The Storefront site was preserved unaltered.

---

## 5. Actual Inventory Hosting Site ID

- **Hosting Site ID:** `univillage-inventory-testing`
- **Target Project:** `univillage-testing-a640c`
- **Hosting Alias:** `inventory`

---

## 6. Actual Inventory Hosting URL

- **Primary URL:** [`https://univillage-inventory-testing.web.app`](https://univillage-inventory-testing.web.app)
- **Secondary Domain:** [`https://univillage-inventory-testing.firebaseapp.com`](https://univillage-inventory-testing.firebaseapp.com)

---

## 7. Firebase Testing Web Configuration

Retrieved verified web app credentials from Firebase Web App `Univillage Testing` (`1:42827689186:web:ec722252bbb769d4d302bb`) and created `client/.env.testing`:

```dotenv
# Firebase Web App Configuration (univillage-testing-a640c)
VITE_FIREBASE_API_KEY=AIzaSyC_9gHBbr2y7x4nQKZyIjqaFuSbQno0l3M
VITE_FIREBASE_AUTH_DOMAIN=univillage-testing-a640c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=univillage-testing-a640c
VITE_FIREBASE_STORAGE_BUCKET=univillage-testing-a640c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=42827689186
VITE_FIREBASE_APP_ID=1:42827689186:web:ec722252bbb769d4d302bb
VITE_FIREBASE_MEASUREMENT_ID=

# Inventory Cloud Run Backend API URL (Testing)
VITE_BACKEND_URL=https://k2k-inventory-api-42827689186.us-central1.run.app
```

Also created `client/.env.testing.example` with documented configuration instructions.

---

## 8. Authentication Domain Configuration

Inspected and updated Firebase Identity Toolkit authorized domains for `univillage-testing-a640c`. Added the new Inventory domains to authorize client authentication flows:

- `localhost`
- `univillage-testing-a640c.firebaseapp.com`
- `univillage-testing-a640c.web.app`
- `univillage-inventory-testing.firebaseapp.com` *(Added in Phase 3)*
- `univillage-inventory-testing.web.app` *(Added in Phase 3)*

---

## 9. Cloud Run CORS Verification

Verified backend CORS allowlist on `k2k-inventory-api`. Executed live `OPTIONS` preflight request from origin `https://univillage-inventory-testing.web.app`:
- **Preflight Request:**
  `OPTIONS /api/products`  
  `Origin: https://univillage-inventory-testing.web.app`
- **Response Headers:**
  `Access-Control-Allow-Origin: https://univillage-inventory-testing.web.app`  
  `Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`  
  `Access-Control-Allow-Credentials: true`
- **Result:** CORS preflight passed with strict origin validation (no wildcard).

---

## 10. Deployment Scripts Created

Created dual deployment scripts supporting `--check`, `--deploy`, and `--status`:
1. `client/deploy.inventory.testing.ps1` (PowerShell native for Windows)
2. `client/deploy.inventory.testing.sh` (Bash for CI/CD and POSIX environments)

Both scripts enforce:
- Node.js, npm, and Firebase CLI prerequisites.
- Target project isolation check.
- Backend Cloud Run health probe before proceeding.
- Verification that target alias `inventory` strictly maps to `univillage-inventory-testing` (and never Storefront).
- Automated frontend test execution (`npm test`).
- Production leak detection in compiled JS bundles.
- Scoped deployment: `firebase deploy --only hosting:inventory --project univillage-testing-a640c`.

---

## 11. Files Created or Modified

| Path | Action | Description |
| :--- | :--- | :--- |
| `firebase.json` | Created | Root Firebase Hosting configuration scoped to `target: inventory` (`client/dist`) |
| `.firebaserc` | Created | Root Firebase project and target mapping (`inventory` -> `univillage-inventory-testing`) |
| `client/firebase.json` | Created | Client-scoped Hosting configuration (`public: dist`) |
| `client/.firebaserc` | Created | Client-scoped Firebase target mapping |
| `client/.env.testing` | Created | Testing environment variables pointing to testing Firebase & Cloud Run |
| `client/.env.testing.example` | Created | Documented environment template |
| `client/deploy.inventory.testing.ps1` | Created | Automated PowerShell deployment and verification script |
| `client/deploy.inventory.testing.sh` | Created | Automated Bash deployment script |
| `client/verify.live.frontend.js` | Created | Live end-to-end integration and security test suite |
| `INVENTORY_PHASE3_DEPLOYMENT_REPORT.md` | Created | Comprehensive Phase 3 audit and verification report |

---

## 12. Frontend Build Results

Vite build compiled in testing mode:
```
> tsc -b && vite build --mode testing
✓ 3178 modules transformed.
dist/index.html                     0.48 kB │ gzip:   0.31 kB
dist/assets/index-C228ar4K.css     82.24 kB │ gzip:  13.56 kB
dist/assets/index-D5WzWe9J.js   2,230.07 kB │ gzip: 606.58 kB
✓ built in 18.02s
```
**Bundle Security Inspection:**
- `Contains testing project ID (univillage-testing-a640c):` **true**
- `Contains backend Cloud Run URL (k2k-inventory-api):` **true**
- `Contains production project ID (univillage-503009):` **false (0 occurrences)**
- `Contains Render URL:` **false (0 occurrences)**

---

## 13. Hosting Deployment Results

Deployment executed via scoped command:
```bash
firebase deploy --only hosting:inventory --project univillage-testing-a640c
```

**Deployment Log Output:**
```
=== Deploying to 'univillage-testing-a640c'...
i  deploying hosting
i  hosting[univillage-inventory-testing]: beginning deploy...
i  hosting[univillage-inventory-testing]: found 3 files in client/dist
+  hosting[univillage-inventory-testing]: file upload complete
i  hosting[univillage-inventory-testing]: finalizing version...
+  hosting[univillage-inventory-testing]: version finalized
i  hosting[univillage-inventory-testing]: releasing new version...
+  hosting[univillage-inventory-testing]: release complete
+  Deploy complete!
Hosting URL: https://univillage-inventory-testing.web.app
```

---

## 14. Authentication Test Results

- **Testing Auth Base:** Shared Firebase Auth user pool in `univillage-testing-a640c`.
- **ID Token Issuance:** Tokens minted with audience `univillage-testing-a640c`.
- **Bearer Token Forwarding:** Verified in `client/src/services/api/api.ts` request interceptor (`Authorization: Bearer <token>`).
- **Role Verification:** `/auth/admin/login` decodes Firebase ID tokens, checks custom claims (`role === 'admin'`) and `admin/{uid}`. Non-admin users are rejected with `HTTP 403 Forbidden`.
- **Unauthenticated Protection:** Direct unauthenticated requests to protected API endpoints return `HTTP 401 Unauthorized`.

---

## 15. Inventory API Integration Results

Live integration between the hosted frontend and Cloud Run backend verified:
- **API Base URL:** `https://k2k-inventory-api-42827689186.us-central1.run.app/api`
- **Public Catalog Read (`/api/products`):** `HTTP 200 OK` (2 products loaded).
- **Public Health Probe (`/health`):** `HTTP 200 OK`.
- **Protected Mutations (`POST /api/products/create`):** `HTTP 401 Unauthorized` without token.

---

## 16. Shared Firestore Verification

Confirmed both Storefront and Inventory share the exact same Firestore database:
- **Project ID:** `univillage-testing-a640c`
- **Database:** `(default)`
- **Sample Document Verified:**
  - Collection: `products`
  - Document ID: `gQrDjBHALohaVZxTRLor`
  - Name: `Home Made Desi Cow Ghee`
  - SKU: `GHEE-001`
  - Stock Status: `in_stock`
  - Schema Version: `1`

---

## 17. Existing Storefront Isolation

Storefront services were verified post-deployment to confirm zero side-effects:
- **Storefront Frontend (`https://univillage-testing-a640c.web.app`):** `HTTP 200 OK`
- **Storefront Backend (`https://k2k-storefront-api-42827689186.us-central1.run.app/health`):** `HTTP 200 OK` (`status: healthy`)
- **Storefront Hosting Site:** Untouched. Deployment target was strictly constrained to `hosting:inventory`.

---

## 18. Firebase Storage Status

- **Status:** Cloud Storage bucket `gs://univillage-testing-a640c.firebasestorage.app` remains unprovisioned.
- **Handling:** Image upload attempts gracefully fail with `HTTP 503 Service Unavailable` (`STORAGE_UNAVAILABLE`) rather than crashing the backend or hanging the frontend.
- **Action Plan:** Provision storage bucket in Firebase Console or via `gcloud storage` when image uploads are needed in testing.

---

## 19. Security Test Results

All automated test suites executed cleanly:
- **Backend Security Suite:** 44 passing tests (0 failures).
- **Frontend Unit Suite:** 69 passing tests (0 failures).
- **Live Integration Suite:** 9 passing live checks (0 failures).
- **Total Automated Checks:** **122 passed, 0 failed.**

---

## 20. Costs and Resource Considerations

- **Firebase Hosting:** Free tier (Spark plan included allowances).
- **Cloud Run:** Scaled to 0 instances when idle (`min-instances: 0`, `max-instances: 1`), CPU throttling enabled.
- **Testing Overhead:** Near-zero ongoing cost while maintaining immediate readiness.

---

## 21. Remaining Blockers

- **Firebase Storage Bucket:** Image uploads currently return 503 until `univillage-testing-a640c.firebasestorage.app` is provisioned.
- **Admin User Seeding:** Admin self-registration is closed for security; new testing admins must be added via Firebase Admin CLI or by an existing admin.

---

## 22. Rollback Procedure

If rollback is ever necessary:
1. Revert to a previous Hosting release:
   ```bash
   firebase hosting:clone univillage-testing-a640c:<PREVIOUS_VERSION> univillage-inventory-testing:live --project univillage-testing-a640c
   ```
2. Disable site traffic:
   ```bash
   firebase hosting:sites:delete univillage-inventory-testing --project univillage-testing-a640c
   ```

---

## 23. Repeat Deployment Commands

To deploy future frontend updates to testing:

**PowerShell (Windows):**
```powershell
powershell -ExecutionPolicy Bypass -File client/deploy.inventory.testing.ps1 -Action --deploy
```

**Bash (Linux / CI):**
```bash
bash client/deploy.inventory.testing.sh --deploy
```

---

## 24. Final Verdict

### **VERDICT: PASS**

The Univillage Inventory frontend is successfully deployed to Firebase Hosting (`univillage-inventory-testing`), communicates securely with the Cloud Run backend (`k2k-inventory-api`), uses the testing Firebase Authentication service, and shares the testing Firestore database with Storefront without interference.

