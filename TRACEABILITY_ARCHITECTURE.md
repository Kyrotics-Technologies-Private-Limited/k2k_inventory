# Inventory ↔ Traceability Architecture

This document describes how the **Inventory** system (this repo) and the separate
**Traceability** system link products, and the rules that keep them consistent.

---

## 1. Two systems, one Firestore

Both systems share the same Firebase project (`univillage-503009`) and Firestore,
but they are independently deployed apps.

| System | Owns | Reads |
|--------|------|-------|
| **Inventory** (this repo) | `products`, `categories`, `orders`, `users`, `productCodes`, `counters` | — |
| **Traceability** (separate app) | `productCategory` root lineage, batch/packet data | `products`, `productCategory` |

The Inventory app is the **source of truth for product name, image, description,
categories, and visibility (`status`)**. The Traceability app owns the printed
code lineage (batch/packet) — see §4.

---

## 2. The link

Each inventory product is linked 1:1 to a traceability root:

```
products/{productId}
  traceabilityDocId ─────────────► productCategory/{rootDocId}
  productCode = "002"             productId = {productId}
                                  productCode = "002"   ← canonical
```

- **Link key:** `traceabilityDocId` (root document ID). Never pair by list
  position or `rank`.
- **Code key:** `productCode` (permanent 3-digit), mirrored on both docs.

Neither `rank` nor array position is ever used to associate a product with a
traceability record. Doing so previously caused the bug where
"WOOD PRESSED MUSTARD OIL" displayed the disabled status of the Sesame product
that happened to sit in the same list position.

---

## 3. Field ownership & sync rules

`buildSnapshotFields()` projects these from `products` → `productCategory`:

| Root field | Source |
|------------|--------|
| `productName` | `products.name` |
| `productImage` | `products.images.main` |
| `productDetails` | `products.shortDescription` → fallback `products.description` |
| `description` | `products.description` |
| `categoryIds` | `products.categoryIds` (or `[categoryId]`) |
| `status` | `products.status` (default `active`) |

Synced on **create**, **update**, **status change**, and **reconcile**.
`rank` is deliberately **excluded** — it is storefront display order only.

`productCode` is canonical on the **root** (it is what was printed on the jar).
Reconciliation pushes the root's code back onto the product if they diverge.

---

## 4. Product codes

- Format: **3-digit** zero-padded string, e.g. `"001"`.
- Unique per product, lifetime-permanent, printed on the jar.
- Allocated atomically from `counters/productCode` (monotonic, seeded from the
  max existing code) and recorded in the `productCodes` registry (doc ID = code).
- Retired codes are marked `retiredAt`/`retiredProductId` and are **never
  reassigned** to another product.
- Admin edits go through `POST /api/admin/traceability/change-code`, which:
  1. validates the format,
  2. enforces uniqueness via the registry,
  3. writes an audit entry to `products/{id}/codeHistory`,
  4. retires the previous code,
  5. syncs the linked root.

### On-jar 13-digit trace code

```
productCode(3) + batch(5) + packet(5) = 13 digits
 e.g.   002    +  00017  +  00042   = 0020001700042
```

Inventory owns only the first 3 digits. Batch/packet segments belong to the
Traceability system and are not stored here.

> **Note:** `rank` (UI ordering) and `productCode` (permanent printed code) are
> two separate numbering systems. They must never be conflated.

---

## 5. Reconciliation & repair

| Operation | Entry point | Effect |
|-----------|-------------|--------|
| Integrity check | `GET /api/admin/traceability/integrity/:productId` | Reports missing/mismatched/duplicate links |
| Scan orphans | `GET /api/admin/traceability/orphan-roots` | Roots whose product is gone |
| Repair missing root | `POST /api/admin/traceability/repair/missing-root` | Creates + links a root |
| Repair stale pointer | `POST /api/admin/traceability/repair/stale-pointer` | Fixes dead `traceabilityDocId` |
| Reconcile all | `POST /api/admin/traceability/reconcile` (`dryRun`) | Snapshot + code + link alignment; creates missing roots; tombstones orphans |
| Rebuild registry | `POST /api/admin/traceability/rebuild-code-registry` (`dryRun`) | Rebuilds `productCodes` + counter from products; reports duplicate codes |

CLI equivalents:

```bash
cd server
npm run backfill:traceability-codes:dry-run   # preview
npm run backfill:traceability-codes           # apply
```

---

## 6. Invariants (do not violate)

1. Link by `traceabilityDocId` / `productCode`, **never** by `rank` or position.
2. `rank` is UI ordering only and is never synced to traceability.
3. `productCode` is unique, permanent, and never reassigned after retirement.
4. `status` is mirrored to the root; the traceability UI reflects inventory visibility.
5. `productCode` / `productCategoryId` are server-owned on create/update and
   change only through the guarded change-code endpoint.
6. Batch/packet segments of the 13-digit code are owned by the traceability app,
   not inventory.

---

## 7. Migration & rollout

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Constants: `productCodes`, `counters`, `PRODUCT_CODE_LENGTH`, schema v3 | Done |
| 2 | Service: code allocator, registry, `changeProductCode`, `retireProductCodeForProduct`, reconcile | Done |
| 3 | Controllers/routes: code endpoints, reconcile; sync on status change; retire on delete | Done |
| 3.5 | Backfill script + `npm run backfill:traceability-codes` | Done |
| 4 | Client: `productCode` type, read-only display, guarded change API, "Display Order" label | Done |
| 5 | Run reconcile against production (dry-run → apply); verify traceability portal | Pending |
