/**
 * Backfill / reconcile the inventory ↔ traceability linkage.
 *
 * 1. Rebuilds the `productCodes` registry and seeds the allocator counter from
 *    the `products` collection (reports duplicate-code conflicts).
 * 2. Reconciles every `productCategory` root against its linked product:
 *    syncs snapshot + status, aligns the permanent product code, creates
 *    missing roots, relinks stale pointers, and tombstones orphan roots.
 *
 * Usage (from server/):
 *   node scripts/backfillTraceabilityCodes.js            # dry run (default)
 *   node scripts/backfillTraceabilityCodes.js --dry-run
 *   node scripts/backfillTraceabilityCodes.js --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  rebuildProductCodeRegistry,
  reconcileTraceabilityRoots,
} = require('../services/traceabilityRootService');

const apply = process.argv.includes('--apply');
const dryRun = !apply;

async function main() {
  console.log(`Traceability backfill ${dryRun ? '(DRY RUN)' : '(APPLY)'}...\n`);

  console.log('== Rebuilding product code registry ==');
  const registry = await rebuildProductCodeRegistry({ dryRun });
  console.log(`  registered: ${registry.registered}, max code: ${registry.max}`);
  if (registry.conflicts.length) {
    console.warn(`  CONFLICTS (duplicate codes): ${registry.conflicts.length}`);
    registry.conflicts.forEach((c) => console.warn(`    ${c.code} -> ${c.productIds.join(', ')}`));
  }

  console.log('\n== Reconciling traceability roots ==');
  const report = await reconcileTraceabilityRoots({ dryRun });
  console.log(`  roots scanned:   ${report.scannedRoots}`);
  console.log(`  pending changes: ${report.changes.length}`);
  console.log(`  roots updated:   ${report.rootsUpdated}`);
  console.log(`  products updated:${report.productsUpdated}`);
  console.log(`  roots created:   ${report.rootsCreated}`);
  console.log(`  tombstones:      ${report.tombstones}`);
  console.log(`  orphans:         ${report.orphans.length}`);
  report.orphans.forEach((o) => console.log(`    root ${o.rootId} (product ${o.productId || '—'}): ${o.reason}`));

  if (dryRun) {
    console.log('\nDry run complete. Re-run with --apply to write changes.');
  } else {
    console.log('\nApply complete.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
