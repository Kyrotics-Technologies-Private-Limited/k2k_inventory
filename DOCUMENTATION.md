# K2K Inventory — Developer Documentation

> **Audience:** Senior developers onboarding to this codebase.  
> **Last updated:** June 2026  
> **Stack:** React 19 + TypeScript (Vite) · Node.js + Express 5 · Firebase (Firestore, Auth, Storage)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Data Model (Firestore)](#4-data-model-firestore)
5. [Controllers Reference](#5-controllers-reference)
6. [API Reference](#6-api-reference)
7. [Core Business Workflows](#7-core-business-workflows)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Configuration & Environment](#10-configuration--environment)
11. [Utilities & Scripts](#11-utilities--scripts)
12. [Known Issues & Gotchas](#12-known-issues--gotchas)

---

## 1. System Overview

K2K Inventory is a **full-stack admin inventory management system** for an e-commerce operation (K2K). It manages:

- **Products** with images, categories, badges, and traceability roots
- **Variants** (weight/SKU-level inventory with `units_in_stock`)
- **Orders** with stock decrement/restock and PDF invoice generation
- **Customers**, **carts**, **addresses**, **reviews**, and **membership plans**
- **Dashboard analytics**, **finance analysis**, and **GST invoice reports**

There is **no SQL database**. All persistence is via **Firebase Firestore** (document/collection model). The backend uses direct Firestore SDK calls inside controllers — there is no ORM or repository layer except for the dedicated **traceability service**.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT  (client/)                                                   │
│  React 19 · TypeScript · Vite · Tailwind · MUI · Shadcn              │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ App.tsx     │  │ AdminContext │  │ services/api/*.ts (Axios)   │  │
│  │ (routing)   │  │ (session)    │  │ + Firebase Auth interceptor │  │
│  └─────────────┘  └──────────────┘  └─────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  HTTP  /api/*
                                │  Authorization: Bearer <Firebase ID token>
┌───────────────────────────────▼──────────────────────────────────────┐
│  SERVER  (server/)                                                   │
│  Express 5 · Node.js                                                 │
│                                                                      │
│  index.js ──► routes/*.js ──► controllers/*.js ──► Firestore       │
│                    │                                                 │
│                    └── middleware/firebaseAuth.js (token verify)       │
│                                                                      │
│  services/traceabilityRootService.js  (only extracted service layer) │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  FIREBASE                                                            │
│  Firestore (data) · Auth (users/admins) · Storage (images/invoices)  │
└──────────────────────────────────────────────────────────────────────┘
```

### Design Patterns

| Pattern | Where |
|---------|-------|
| **MVC** | `routes` → `controllers` → Firestore |
| **Service layer** | Only `traceabilityRootService.js` (product ↔ traceability linking) |
| **Middleware** | `firebaseAuth.js` on protected routes |
| **Schema versioning** | `schemaVersion` fields on products and traceability roots |
| **Subcollections** | Variants under products; cart items under carts; memberships under users |

---

## 3. Project Structure

```
k2k_inventory/
├── client/                          # Frontend (admin UI only)
│   ├── src/
│   │   ├── App.tsx                  # React Router — all admin routes
│   │   ├── main.tsx                 # Bootstrap + AdminProvider
│   │   ├── components/admin/layout/ # Layout, Navbar, Sidebar
│   │   ├── context/AdminContext.tsx # Admin session from Firestore
│   │   ├── pages/admin/             # All admin pages
│   │   ├── services/
│   │   │   ├── api/                 # Axios API clients per domain
│   │   │   └── firebase/firebase.ts # Firebase client SDK
│   │   ├── types/                   # TypeScript interfaces
│   │   └── utils/
│   │       ├── ProtectedRoute.tsx   # Route guard
│   │       └── gstCalculations.ts   # GST / membership pricing
│   ├── netlify.toml                 # SPA deploy config
│   └── package.json
│
├── server/                          # Backend API
│   ├── index.js                     # Entry point (port 5567)
│   ├── config.env                   # Server secrets (not committed)
│   ├── controllers/                 # 13 controller files
│   ├── routes/                      # Express route definitions
│   ├── middleware/firebaseAuth.js
│   ├── services/traceabilityRootService.js
│   ├── constants/traceabilityConstants.js
│   ├── firebase/firebase-config.js  # Firebase Admin init
│   ├── registerAdmin.js             # Seed admin user script
│   └── package.json
│
├── README.md                        # High-level project readme (partially outdated)
└── DOCUMENTATION.md                 # This file
```

### Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, React Router 7, Tailwind 4, MUI 7, Shadcn/Radix, Axios, Firebase 11, ApexCharts/Chart.js/Recharts, Framer Motion, Zod, React Hook Form |
| **Backend** | Node.js, Express 5.1, Firebase Admin 13, CORS, dotenv, multer, uuid, PDFKit, jsPDF |
| **Data** | Firebase Firestore (NoSQL), Firebase Storage |
| **Auth** | Firebase Authentication |

> **Note:** Redux Toolkit is listed in `client/package.json` but is **not wired** in `main.tsx`. State is managed via React Context and local component state.

---

## 4. Data Model (Firestore)

### Entity Relationship Diagram

```
categories ─────────────────────────────────────────┐
                                                    │ categoryId / categoryIds
products ───────────────────────────────────────────┤
  └── variants (subcollection)                      │
       units_in_stock  ◄── inventory field          │
                                                    │
productCategory (traceability roots) ◄──────────────┘
  traceabilityDocId ↔ product (1:1)

users
  └── memberships (subcollection) ──► membership (plan definitions, top-level)

carts
  └── cartItems (subcollection)

orders ──► userId → users
       ──► address_id → addresses
       ──► items[].productId + variantId → products/variants

reviews ──► productId, userId

admin (doc ID = Firebase uid)
```

---

### Collection: `products`

**Path:** `products/{productId}`  
**Controller:** `ProductController.js`  
**TypeScript:** `client/src/types/index.ts`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Firestore document ID |
| `name` | string | Product name |
| `price` | `{ amount: number, currency: "INR" }` | Base/display price |
| `description` | string | Full description |
| `shortDescription` | string? | Short summary (used in traceability snapshot) |
| `origin` | string | Product origin |
| `sku` | string | Stock keeping unit |
| `warehouseName` | string | Warehouse location |
| `category` | string? | Single category name (legacy, when one category) |
| `categoryId` | string? | Single category ID |
| `categories` | string[]? | Multiple category names |
| `categoryIds` | string[]? | Multiple category IDs |
| `images` | `{ main, gallery[], banner }` | Image URLs (Firebase Storage) |
| `isBestseller` | boolean? | Bestseller flag |
| `stockStatus` | `"in_stock" \| "low_stock" \| "out_of_stock"` | Aggregate stock status |
| `ratings` | number | Average rating |
| `reviews` | number | Review count |
| `badges` | `{ text, type?, image? }[]` | Product badges |
| `healthBadges` | `{ image?, title, description }[]` | Health certification badges |
| `benefits` | `{ title, description, icon }[]` | Product benefits |
| `traceabilityDocId` | string? | Linked `productCategory` root doc ID |
| `productCategoryId` | string? | Sequential ID e.g. `"001"`, `"002"` |
| `schemaVersion` | number | Currently `2` |

**Subcollection:** `products/{productId}/variants` — see below.

**Category resolution logic:** On create/update, if `categoryIds` is provided:
- **1 category** → stores `category` + `categoryId` (singular fields)
- **2+ categories** → stores `categories` + `categoryIds` (array fields)

---

### Subcollection: `products/{productId}/variants`

**Controller:** `VariantController.js`  
**TypeScript:** `client/src/types/variant.ts`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Subcollection document ID |
| `productId` | string | Parent product ID (added in cross-product queries) |
| `weight` | string | Variant label (e.g. `"500g"`, `"1L"`) |
| `price` | number | Selling price |
| `originalPrice` | number? | MRP / original price |
| `discount` | number? | Discount amount or percentage |
| `gstPercentage` | number? | GST rate for tax calculations |
| `units_in_stock` | number | **Primary inventory field** |
| `inStock` | boolean | Auto-computed: `units_in_stock > 0` |
| `stockStatus` | string? | Updated on order create/cancel |
| `createdAt` | Date/Timestamp | Creation time |
| `updatedAt` | Date/Timestamp | Last update |

**Stock thresholds (dashboard):**
- Out of stock: `units_in_stock === 0`
- Low stock: `units_in_stock <= 5`
- Overstock: `units_in_stock >= 100`

---

### Collection: `productCategory` (Traceability Roots)

**Service:** `traceabilityRootService.js`  
**Constants:** `constants/traceabilityConstants.js`

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | FK to `products` document |
| `productCategoryId` | string | Sequential `"001"`, `"002"`, … |
| `productName` | string | Snapshot from product |
| `productImage` | string | Snapshot of `images.main` |
| `productDetails` | string | Snapshot of `shortDescription` or `description` |
| `description` | string | Full description snapshot |
| `categoryIds` | string[] | Category IDs from product |
| `entityType` | `"traceability_root"` | Entity discriminator |
| `schemaVersion` | number | Currently `2` |
| `deletedAt` | Timestamp? | Soft-delete tombstone |
| `createdAt`, `updatedAt` | Timestamp | Audit fields |

**Purpose:** Links each inventory product to a traceability root used by a separate traceability UI. Created atomically with the product in a Firestore transaction.

---

### Collection: `categories`

**Controller:** `CategoryController.js`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Document ID |
| `name` | string | Display name (unique) |
| `key` | string | URL slug (auto-generated from name if omitted) |
| `createdAt` | ISO string | |
| `updatedAt` | ISO string | |

**Delete guard:** Cannot delete a category if any product references it via `categoryId` or `categoryIds`.

---

### Collection: `orders`

**Controller:** `orderController.js`  
**TypeScript:** `client/src/types/order.ts`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Customer Firebase UID |
| `address_id` | string | Reference to `addresses` collection |
| `address` | object? | Embedded address (used in invoice generation) |
| `total_amount` | number | Order total |
| `payment_id` | string | Payment reference |
| `items` | array | Line items (see below) |
| `shipping_method` | string | Default `"standard"` |
| `payment_method` | string | Default `"COD"` |
| `status` | string | `Placed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`, `Returned` |
| `createdAt`, `updatedAt` | Timestamp | |
| `placedDate` | Timestamp? | Set on status → Placed |
| `processingDate` | Timestamp? | Set on status → Processing |
| `shippedDate` | Timestamp? | Set on status → Shipped |
| `deliveredDate` | Timestamp? | Set on status → Delivered |
| `cancelledDate` | Timestamp? | Set on status → Cancelled |
| `returnedDate` | Timestamp? | Set on status → Returned |
| `invoiceUrl` | string? | Firebase Storage URL (generated on Delivered) |
| `invoiceNumber` | string? | e.g. `K2K-20260608-abc123` |
| `invoiceDate` | Timestamp? | |
| `discount` | number? | Total item discount |
| `shipping_fee`, `tax`, `gstIncludingSubtotal` | number? | Used in reports |

**Order item shape (`items[]`):**

```javascript
{
  productId: string,
  variantId: string,
  quantity: number,
  price: number,           // from variant at order time
  discount: number,
  gstPercentage: number,
  variant_name: string,    // variant weight label
  unit_price: number,
  name?: string,           // optional product name
  hsn?: string             // optional HSN code
}
```

> **Status casing:** Server stores PascalCase (`Placed`, `Delivered`). API responses normalize to lowercase for the frontend.

---

### Collection: `users`

**Controllers:** `adminController.js`, `membershipController.js`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string? | Display name |
| `email` | string? | Email |
| `phone` | string? | Phone number |
| `createdAt` / `joinDate` | Timestamp/string | Registration date |
| `isMember` | boolean? | Kishan Parivar membership flag |
| `membershipEnd` | Timestamp? | Membership expiry |

**Subcollection:** `users/{userId}/memberships/{membershipId}`

| Field | Type | Description |
|-------|------|-------------|
| `active` | boolean | Whether membership is active |
| `purchasedAt` | Date | Purchase date |
| `expiresAt` | Date | Expiry date |
| `membershipType` | string | Plan type reference |
| `discountPercentage` | number | Member discount rate |
| `cancelledAt` | Date? | Cancellation date |

---

### Collection: `membership` (Plan Definitions)

**Controller:** `membershipController.js`  
**TypeScript:** `client/src/types/MembershipSettings.ts`

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Plan identifier |
| `description` | string | Plan description |
| `price` | number | Plan price |
| `duration` | number | Duration in months |
| `discountPercentage` | number | Discount for members |
| `createdAt`, `updatedAt` | Date | |

---

### Collection: `carts`

**Controller:** `cartController.js`  
**TypeScript:** `client/src/types/cart.ts`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string? | Owner UID |
| `createdAt`, `updatedAt` | Date | |

**Subcollection:** `carts/{cartId}/cartItems`

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | |
| `variantId` | string | |
| `quantity` | number | |
| `createdAt`, `updatedAt` | Date | |

> Cart does **not** decrement stock. Stock changes happen at order creation.

---

### Collection: `addresses`

**Controller:** `addressController.js`  
**TypeScript:** `client/src/types/address.ts`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Owner UID |
| `name` | string | Recipient name |
| `phone` | string | Contact phone |
| `appartment` | string | Apartment/unit (note spelling) |
| `address` | string | Street address |
| `state` | string | State |
| `country` | string | Country |
| `pincode` | string | Postal code |
| `isDefault` | boolean | Default address flag |
| `createdAt` | ISO string | |

---

### Collection: `reviews`

**Controller:** `reviewController.js`

| Field | Type | Description |
|-------|------|-------------|
| `rating` | number | 1–5 rating |
| `comment` | string | Review text |
| `productId` | string | Product reference |
| `userId` | string | Reviewer UID |
| `createdAt`, `updatedAt` | ISO string | |

---

### Collection: `admin`

**Controllers:** `authController.js`, `registerAdmin.js`  
**Frontend:** `AdminContext.tsx`

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Document ID = Firebase Auth UID |
| `email` | string | Admin email |
| `name` | string | Admin display name |
| `role` | `"admin"` | Role identifier |
| `createdAt` | ISO string | Registration date |

---

## 5. Controllers Reference

All controllers live in `server/controllers/`.

### `ProductController.js`

| Export | Description |
|--------|-------------|
| `createProduct` | Creates product + traceability root in a Firestore transaction. Resolves `categoryIds` → category names. |
| `getAllProducts` | Returns all products. |
| `getProductById` | Returns single product by ID. |
| `updateProduct` | Updates product and syncs traceability root snapshot. |
| `deleteProduct` | Soft-deletes traceability root (`deletedAt`), then deletes product doc. |

### `VariantController.js`

| Export | Description |
|--------|-------------|
| `createVariant` | Creates variant subcollection doc. Sets `inStock` from `units_in_stock`. |
| `getProductVariants` | Lists variants for one product. |
| `getAllVariants` | Lists all variants across all products (includes `productId`). |
| `getVariant` | Single variant by product + variant ID. |
| `updateVariant` | Updates variant fields and recalculates `inStock`. |
| `deleteVariant` | Deletes variant document. |

### `CategoryController.js`

| Export | Description |
|--------|-------------|
| `createCategory` | Creates category with auto-generated `key` slug. |
| `getAllCategories` | Lists all categories. |
| `updateCategory` | Updates name/key. |
| `deleteCategory` | Deletes if no products reference it. |

### `orderController.js`

| Export | Description |
|--------|-------------|
| `createOrder` | Validates stock, decrements `units_in_stock`, enriches items with variant data, creates order. |
| `getAllOrders` | User-scoped order list (⚠ shadowed by admin route — see Gotchas). |
| `cancelOrder` | Cancels order and restocks inventory. |
| `updateOrder` | Updates `address_id` or `payment_method`. |
| `trackOrder` | Returns order status. |
| `getAllOrdersForAdmin` | All orders with resolved `username`. |
| `adminGetOrderById` | Single order for admin. |
| `adminUpdateOrderStatus` | Updates status, sets timestamp fields, restocks on cancel, generates PDF invoice on deliver. |

**Helper:** `restockOrderItems(items)` — adds `quantity` back to each variant's `units_in_stock`.

### `cartController.js`

| Export | Description |
|--------|-------------|
| `createCart` | Creates empty cart. |
| `getUserCart` | Finds or auto-creates cart for authenticated user. |
| `getCarts` | Lists all carts. |
| `getCartById` | Single cart. |
| `updateCart` | Updates cart timestamp. |
| `deleteCart` | Deletes cart and items. |
| `getCartItems` | Lists items in cart. |
| `addCartItem` | Adds or merges item (by `productId` + `variantId`). |
| `updateCartItem` | Updates item quantity. |
| `removeCartItem` | Removes single item. |

### `addressController.js`

| Export | Description |
|--------|-------------|
| `getAllAddresses` | User's addresses. |
| `createAddress` | Creates address. |
| `getAddressById` | Single address. |
| `updateAddress` | Updates address fields. |
| `deleteAddress` | Deletes address. |
| `setDefaultAddress` | Sets one address as default. |

### `reviewController.js`

| Export | Description |
|--------|-------------|
| `getCurrentUserReview` | Current user's reviews. |
| `createReview` | Creates review. |
| `updateOwnReview` | Updates own review. |
| `deleteOwnReview` | Deletes own review. |
| `getProductReviews` | Public product reviews. |

### `authController.js`

| Export | Description |
|--------|-------------|
| `adminSignup` | Links existing Firebase user to `admin` collection. |
| `adminLogin` | Verifies Firebase ID token, checks `admin` collection, returns custom JWT (7-day). |

### `adminController.js`

| Export | Description |
|--------|-------------|
| `getAllUsers` | All customers from `users` collection. |
| `getCustomerWithOrders` | Customer profile + order history. |

### `traceabilityAdminController.js`

| Export | Description |
|--------|-------------|
| `traceabilityIssueTypes` | Returns enum of traceability issue types. |
| `validateIntegrity` | Validates product ↔ traceability root linkage. |
| `findOrphanRoots` | Scans for orphan traceability roots. |
| `repairMissingRoot` | Creates missing traceability root for a product. |
| `repairStalePointer` | Fixes stale `traceabilityDocId` on product. |

### `membershipController.js`

| Export | Description |
|--------|-------------|
| `createMembership` | Creates membership plan. |
| `getMemberships` | Lists all plans. |
| `getMembership` | Single plan. |
| `updateMembership` | Updates plan. |
| `deleteMembership` | Deletes plan. |
| `buyMembership` | User purchases membership. |
| `cancelMembership` | Cancels user membership. |
| `getUserMemberships` | User's membership records. |

### `imageUploadController.js`

| Export | Description |
|--------|-------------|
| `uploadGalleryImages` | Multer → Firebase Storage (gallery). |
| `uploadMainImageHandler` | Upload main product image. |
| `uploadBadgeImageHandler` | Upload single badge image. |
| `uploadMultipleBadgeImagesHandler` | Upload multiple badge images. |
| `uploadMultipleHealthBadgeImagesHandler` | Upload health badge images. |

### `reportController.js`

| Export | Description |
|--------|-------------|
| `getInvoiceReports` | Item-level GST invoice rows for delivered orders in date range. |

### `dashboard.js` (inline route handler)

| Endpoint | Description |
|----------|-------------|
| `GET /stats` | Revenue, order counts, stock alerts, bestsellers, chart data. Accepts `?startDate&endDate`. Revenue calculated from line items × variant prices (not `total_amount`). |

---

### Service: `traceabilityRootService.js`

| Function | Purpose |
|----------|---------|
| `createProductWithTraceabilityRootTransaction` | Atomic product + root create |
| `syncTraceabilityRootFromProduct` | Sync snapshot fields on product update |
| `markTraceabilityRootDeletedForProduct` | Soft-delete root on product delete |
| `ensureTraceabilityRoot` | Idempotent link/repair |
| `validateProductTraceability` | Integrity check |
| `findOrphanRoots` | Scan broken links |
| `repairMissingRootForProduct` | Admin repair |
| `repairStaleProductPointer` | Repair stale `traceabilityDocId` |
| `getNextProductCategoryId` | Sequential `"001"` ID generation |

---

## 6. API Reference

**Base URL:** `http://localhost:5567/api` (configurable via `PORT`)

**Auth legend:**
- **Public** — no middleware
- **Auth** — requires `Authorization: Bearer <Firebase ID token>`

### Health

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/` | Public | `"k2k inventory API"` |
| GET | `/api/test` | Public | Server health check |

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/signup` | Public | Register admin (requires existing Firebase `uid`) |
| POST | `/admin/login` | Public | Verify `idToken`, check `admin` collection, return JWT |

### Products (`/api/products`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create` | Public | Create product + traceability root |
| GET | `/` | Public | List all products |
| GET | `/:id` | Public | Get product by ID |
| PUT | `/:id` | Public | Update product |
| DELETE | `/:id` | Public | Delete product |
| POST | `/upload-gallery` | Public | Upload gallery images |
| POST | `/upload-main-image` | Public | Upload main image |
| POST | `/upload-badge-image` | Public | Upload badge image |
| POST | `/upload-multiple-badge-images` | Public | Upload multiple badge images |
| POST | `/upload-multiple-health-badge-images` | Public | Upload health badge images |

### Variants (`/api/variants`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | All variants (all products) |
| POST | `/:productId/createVariant` | Public | Create variant |
| GET | `/:productId/getVariants` | Public | Variants for product |
| GET | `/:productId/getVariant/:variantId` | Public | Single variant |
| PUT | `/:productId/updateVariant/:variantId` | Public | Update variant |
| DELETE | `/:productId/deleteVariant/:variantId` | Public | Delete variant |

### Categories (`/api/categories`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/create` | Public | Create category |
| GET | `/` | Public | List categories |
| PUT | `/:id` | Public | Update category |
| DELETE | `/:id` | Public | Delete category |

### Orders (`/api/orders`) — all routes require Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Admin: all orders (with usernames) |
| GET | `/:orderId` | Admin: get order by ID |
| PATCH | `/:orderId/status` | Admin: update status |
| POST | `/create` | User: create order (decrements stock) |
| PUT | `/:orderId/cancel` | User: cancel order (restocks) |
| PUT | `/:orderId` | User: update address/payment_method |
| GET | `/:orderId/track` | User: track order status |

### Cart (`/api/carts`) — all routes require Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/create` | Create cart |
| GET | `/user` | Get or auto-create user's cart |
| GET | `/get` | List all carts |
| GET | `/:id` | Get cart by ID |
| PUT | `/:id` | Update cart |
| DELETE | `/:id` | Delete cart |
| GET | `/:cartId/get` | Get cart items |
| POST | `/:cartId/items` | Add/merge cart item |
| PUT | `/:cartId/items/:itemId` | Update cart item |
| DELETE | `/:cartId/items/:itemId` | Remove cart item |

### Addresses (`/api/addresses`) — all routes require Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | User's addresses |
| POST | `/` | Create address |
| GET | `/:id` | Get address |
| PUT | `/:id` | Update address |
| DELETE | `/:id` | Delete address |
| PUT | `/:id/default` | Set default address |

### Reviews (`/api/reviews`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my` | Auth | Current user's reviews |
| POST | `/create` | Auth | Create review |
| PUT | `/:id` | Auth | Update own review |
| DELETE | `/:id` | Auth | Delete own review |
| GET | `/product/:productId` | Public | Product reviews |

### Membership (`/api/membership`) — all Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create plan |
| GET | `/` | List plans |
| GET | `/:membershipId` | Get plan |
| PUT | `/:membershipId` | Update plan |
| DELETE | `/:membershipId` | Delete plan |
| POST | `/buy` | Buy membership |
| POST | `/cancel` | Cancel membership |
| GET | `/user/:userId` | User memberships |

### Admin (`/api/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Public | All users/customers |
| GET | `/customers/:customerId` | Public | Customer + order history |
| GET | `/traceability/issue-types` | Auth | Traceability issue enum |
| GET | `/traceability/integrity/:productId` | Auth | Validate traceability |
| GET | `/traceability/orphan-roots` | Auth | Scan orphan roots |
| POST | `/traceability/repair/missing-root` | Auth | Repair missing root |
| POST | `/traceability/repair/stale-pointer` | Auth | Repair stale pointer |

### Dashboard (`/api/dashboard`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Public | Dashboard metrics (`?startDate&endDate`) |

### Reports (`/api/admin/reports`) — all require Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/invoices` | Invoice/GST report (`?startDate&endDate`) |

---

## 7. Core Business Workflows

### 7.1 Product Lifecycle

```
CREATE  POST /api/products/create
        ├── Resolve categoryIds → category names
        ├── Firestore transaction:
        │     ├── Create products/{id}
        │     └── Create productCategory/{id} (traceability root)
        └── Assign traceabilityDocId, productCategoryId, schemaVersion

UPDATE  PUT /api/products/:id
        └── syncTraceabilityRootFromProduct() updates snapshot fields

DELETE  DELETE /api/products/:id
        ├── markTraceabilityRootDeletedForProduct() (sets deletedAt)
        └── Delete product document
```

### 7.2 Inventory Management

```
Variant create/update:
  units_in_stock (number) → inStock = units > 0

Dashboard monitoring:
  out_of_stock  → units_in_stock === 0
  low_stock     → units_in_stock <= 5
  overstock     → units_in_stock >= 100
```

### 7.3 Order → Inventory Flow

```
ORDER CREATE (POST /api/orders/create):
  For each item:
    1. Fetch variant from products/{productId}/variants/{variantId}
    2. Validate inStock && units_in_stock >= quantity
    3. Decrement units_in_stock
    4. Update inStock, stockStatus
    5. Enrich item with price, discount, gstPercentage, variant_name
  Create order document with status = "Placed"

ORDER CANCEL (user PUT /cancel OR admin PATCH status → Cancelled):
  restockOrderItems():
    For each item → units_in_stock += quantity
    Update inStock, stockStatus

ORDER DELIVERED (admin PATCH status → Delivered):
  1. Set deliveredDate timestamp
  2. Generate PDF invoice (PDFKit)
  3. Upload to Firebase Storage
  4. Save invoiceUrl, invoiceNumber, invoiceDate on order
```

### 7.4 Order Status Lifecycle

```
Placed → Processing → Shipped → Delivered
                              ↘ Cancelled (restocks)
                              ↘ Returned
```

Each transition sets a status-specific timestamp: `placedDate`, `processingDate`, `shippedDate`, `deliveredDate`, `cancelledDate`, `returnedDate`.

### 7.5 Cart Workflow

```
1. GET /api/carts/user     → find or create cart for req.user.uid
2. POST /api/carts/:id/items → merge by productId + variantId
3. Stock is NOT decremented until order creation
```

### 7.6 Membership (Kishan Parivar)

```
Plans stored in: membership collection
User purchases → users/{uid}/memberships/{planId}
User flags: users.isMember, users.membershipEnd
Client-side GST utils: client/src/utils/gstCalculations.ts
```

### 7.7 Image Upload Flow

```
Client → POST /api/products/upload-* (multipart/form-data)
       → Multer (memory storage)
       → Firebase Storage upload
       → Returns public URL
       → URL stored in product.images / badges / healthBadges
```

---

## 8. Authentication & Authorization

### Admin Login Flow

```
1. Client: Firebase signInWithEmailAndPassword()
2. Client: POST /api/auth/admin/login { idToken }
3. Server:  verifyIdToken(idToken)
4. Server:  Check admin/{uid} exists in Firestore
5. Server:  Return custom JWT (JWT_SECRET, 7-day expiry)
6. Client:  Store JWT in localStorage as "adminToken"
7. Client:  ProtectedRoute checks Firebase user AND adminToken
```

### API Request Authentication

The Axios interceptor (`client/src/services/api/api.ts`) attaches the **Firebase ID token** (not the custom JWT) to all API requests:

```typescript
Authorization: Bearer <Firebase getIdToken()>
```

Server middleware (`middleware/firebaseAuth.js`) verifies this token and sets:

```javascript
req.user = { uid: decodedToken.uid, email: decodedToken.email }
```

### Authorization Model

| Layer | Protection |
|-------|-----------|
| **Frontend routes** | `ProtectedRoute` — requires Firebase auth + `adminToken` |
| **Backend orders/cart/addresses/reviews/reports** | `firebaseAuth` middleware |
| **Backend products/variants/categories/dashboard/admin users** | **No server-side auth** (public API) |
| **Admin role check** | Only at login time (Firestore `admin` collection) |

> **Security note:** The admin UI is protected on the frontend, but most write endpoints (products, variants, categories) are **unauthenticated on the server**. Any client with the API URL can call them directly.

---

## 9. Frontend Architecture

### Routing (`client/src/App.tsx`)

| Path | Page | Purpose |
|------|------|---------|
| `/admin/login` | AdminLogin | Login |
| `/admin/signup` | AdminSignupLogin | Signup |
| `/admin/forgot-password` | ForgotPassword | Password reset |
| `/admin`, `/admin/dashboard` | Admindashboard | Dashboard |
| `/admin/products` | AdminProducts | Product list/create |
| `/admin/products/:id` | ProductDetailsPage | Product detail/edit |
| `/admin/productlist` | ProductListPage | Product list view |
| `/admin/categories` | CategoryManagement | Category CRUD |
| `/admin/variants/:id` | VariantDetailsPage | Variant list |
| `/admin/variants/:id/edit` | VariantEditPage | Variant edit |
| `/admin/products/:productId/variants` | VariantDetailsPage | Variants by product |
| `/admin/products/:productId/variants/:variantId/edit` | VariantEditPage | Edit variant |
| `/admin/orders` | AdminOrders | Order list |
| `/admin/orders/:orderId` | AdminOrderDetails | Order detail |
| `/admin/customers` | AdminCustomers | Customer list |
| `/admin/customers/:customerId` | CustomerDetailsPage | Customer detail |
| `/admin/membership` | MembershipPage | Membership plans |
| `/admin/out-of-stock` | OutOfStockPage | Out-of-stock products |
| `/admin/finance` | FinanceAnalysis | Finance analytics |
| `/admin/product-analysis` | ProductAnalysis | Product analytics |
| `/admin/reports` | Reports | GST invoice reports |
| `/` | Redirect → `/admin` | |

### API Client Layer (`client/src/services/api/`)

| File | Domain |
|------|--------|
| `api.ts` | Base Axios instance + auth interceptor |
| `productApi.ts` | Product CRUD + image uploads |
| `variantApi.ts` | Variant CRUD |
| `categoryApi.ts` | Category CRUD |
| `orderApi.ts` | Order management |
| `cartApi.ts` | Cart operations |
| `addressApi.ts` | Address CRUD |
| `authApi.ts` | Admin login/signup |
| `membershipApi.ts` | Membership plans |
| `dashApi.ts` | Dashboard stats |

> **Note:** `categoryApi.ts` uses a hardcoded `http://localhost:5567` URL instead of the shared `api.ts` instance.

### TypeScript Types (`client/src/types/`)

| File | Exports |
|------|---------|
| `index.ts` | `Product`, `CartItem`, `FilterState`, `ProductVariant` |
| `variant.ts` | `Variant` |
| `order.ts` | `Order`, `OrderItem`, `OrderStatus`, `CreateOrderPayload` |
| `cart.ts` | `Cart`, `CartItem`, `CartSummary` |
| `address.ts` | `Address` |
| `user.ts` | User types |
| `MembershipSettings.ts` | Membership plan types |

### State Management

- **AdminContext** — admin session from Firestore `admin` collection
- **Component local state** — forms, lists, modals
- **No Redux** — despite being in dependencies

---

## 10. Configuration & Environment

### Server (`server/config.env`)

```env
PORT=5567

# Firebase Admin SDK (service account)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=...
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

JWT_SECRET=your-jwt-secret
```

### Client (`client/.env`)

```env
VITE_BACKEND_URL=http://localhost:5567
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_RECAPTCHA_SITE_KEY=...   # optional, for App Check
```

### Run Commands

```bash
# Backend (port 5567)
cd server && npm install && npm run dev

# Frontend (port 5173)
cd client && npm install && npm run dev

# Production build
cd client && npm run build   # → client/dist/
```

### Deployment

- **Frontend:** Netlify (`client/netlify.toml` — SPA redirect to `index.html`)
- **Backend:** Deploy `server/` to any Node.js host with `config.env` set

---

## 11. Utilities & Scripts

| File | Purpose |
|------|---------|
| `server/registerAdmin.js` | Seeds default admin in Firebase Auth + `admin` collection |
| `server/create_product_test.js` | HTTP POST test product to local API |
| `server/verify_demo_product.js` | Verify product ↔ traceability root linkage |
| `server/verify_categories.js` | HTTP GET categories, print first ID |

### Schema Versioning

No formal migration system. Schema evolution uses:

- `PRODUCT_SCHEMA_VERSION = 2` (products)
- `TRACEABILITY_ROOT_SCHEMA_VERSION = 2` (productCategory roots)
- Admin traceability repair endpoints for retroactive data fixes

---

## 12. Known Issues & Gotchas

| Issue | Details |
|-------|---------|
| **Duplicate `GET /api/orders`** | `getAllOrdersForAdmin` is registered before `getAllOrders`. Express uses the first match — user-scoped order list is unreachable. |
| **Membership route ordering** | `GET /:membershipId` is registered before `GET /user/:userId`. Requests to `/user/...` may be intercepted as a membership ID. |
| **Unauthenticated write endpoints** | Products, variants, categories, dashboard, and admin user routes have no server-side auth despite admin-only UI. |
| **Dual token system** | Login returns a custom JWT stored as `adminToken`, but API calls use Firebase ID tokens. The custom JWT is only checked by `ProtectedRoute`. |
| **`jsonwebtoken` dependency** | Used in `authController.js` but may not be listed in `server/package.json`. |
| **`categoryApi.ts` hardcoded URL** | Uses `http://localhost:5567` instead of `VITE_BACKEND_URL`. |
| **README outdated** | Root `README.md` API paths and env var names differ from actual code (`VITE_BACKEND_URL` not `VITE_API_BASE_URL`; `/products/create` not `POST /products`). |
| **Redux unused** | Listed in dependencies but not initialized in `main.tsx`. |
| **Status casing mismatch** | Server stores `Placed`/`Delivered` (PascalCase); API responses normalize to lowercase for frontend. |
| **No atomic order stock** | Stock decrement happens per-item in a loop without a Firestore transaction — concurrent orders could oversell. |

---

## Quick Reference: File → Responsibility

| File | Responsibility |
|------|---------------|
| `server/index.js` | Server entry, route mounting |
| `server/firebase/firebase-config.js` | Firebase Admin SDK init |
| `server/middleware/firebaseAuth.js` | Bearer token verification |
| `server/services/traceabilityRootService.js` | Product ↔ traceability linking |
| `server/constants/traceabilityConstants.js` | Collection names, schema versions |
| `server/controllers/*.js` | All business logic + Firestore I/O |
| `server/routes/*.js` | Express route definitions |
| `client/src/main.tsx` | App bootstrap |
| `client/src/App.tsx` | React Router |
| `client/src/services/api/api.ts` | Axios + auth interceptor |
| `client/src/context/AdminContext.tsx` | Admin session |
| `client/src/utils/ProtectedRoute.tsx` | Route guard |
| `client/src/types/*.ts` | TypeScript data contracts |

---

*For setup instructions and feature overview, see [README.md](./README.md). This document is the authoritative technical reference for data structures, controllers, and system behavior.*
