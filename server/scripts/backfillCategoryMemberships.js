/**
 * One-time backfill: creates category membership records for products
 * that already have categoryId / categoryIds on the product document.
 *
 * Usage (from server/):
 *   node scripts/backfillCategoryMemberships.js
 *   node scripts/backfillCategoryMemberships.js --dry-run
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { db } = require('../firebase/firebase-config');
const {
  getProductCategoryIds,
  syncProductCategories,
} = require('../services/categoryMembershipService');
const { buildCatalogManifest } = require('../services/catalogManifestService');

const dryRun = process.argv.includes('--dry-run');

async function backfill() {
  const productsSnap = await db.collection('products').get();
  let synced = 0;
  let skipped = 0;

  console.log(`Found ${productsSnap.size} products${dryRun ? ' (dry run)' : ''}...`);

  for (const doc of productsSnap.docs) {
    const data = doc.data();
    const categoryIds = getProductCategoryIds(data);

    if (categoryIds.length === 0) {
      skipped += 1;
      continue;
    }

    console.log(`  ${doc.id} -> [${categoryIds.join(', ')}]`);

    if (!dryRun) {
      const result = await syncProductCategories(doc.id, categoryIds);
      if (result.skippedCategoryIds?.length) {
        console.warn(
          `    skipped missing categories: ${result.skippedCategoryIds.join(', ')}`,
        );
      }
    }
    synced += 1;
  }

  if (!dryRun) {
    console.log('Rebuilding catalog manifest...');
    await buildCatalogManifest();
  }

  console.log(`Done. Synced: ${synced}, skipped (no category): ${skipped}`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
