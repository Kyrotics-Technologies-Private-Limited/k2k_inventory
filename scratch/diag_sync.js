const { db } = require('../server/firebase/firebase-config');

async function diag() {
  try {
    const roots = await db.collection('productCategory').get();
    console.log('=== productCategory (traceability roots):', roots.size, '===');
    const rootRows = [];
    roots.docs.forEach((doc) => {
      const d = doc.data() || {};
      rootRows.push({
        rootDocId: doc.id,
        productCategoryId: d.productCategoryId,
        productId: d.productId,
        productName: d.productName,
        status: d.status,
        isActive: d.isActive,
        disabled: d.disabled,
        deletedAt: d.deletedAt ? 'SET' : null,
        rank: d.rank,
        sortOrder: d.sortOrder,
      });
    });
    rootRows.sort((a, b) => String(a.productCategoryId).localeCompare(String(b.productCategoryId)));
    rootRows.forEach((r) => console.log(JSON.stringify(r)));

    const prods = await db.collection('products').get();
    console.log('\n=== products (inventory):', prods.size, '===');
    const prodRows = [];
    prods.docs.forEach((doc) => {
      const d = doc.data() || {};
      prodRows.push({
        productId: doc.id,
        name: d.name,
        status: d.status,
        rank: d.rank,
        productCategoryId: d.productCategoryId,
        traceabilityDocId: d.traceabilityDocId,
        categoryIds: (d.categoryIds || []).length,
      });
    });
    prodRows.sort((a, b) => {
      const ra = a.rank === undefined || a.rank === null ? 999999 : a.rank;
      const rb = b.rank === undefined || b.rank === null ? 999999 : b.rank;
      return ra - rb;
    });
    prodRows.forEach((r) => console.log(JSON.stringify(r)));

    console.log('\n=== LINK CHECK ===');
    const prodById = new Map(prodRows.map((p) => [p.productId, p]));
    rootRows.forEach((r) => {
      const p = prodById.get(r.productId);
      const nameMatches = p && p.name === r.productName;
      console.log(
        `${r.productCategoryId} root="${r.productName}" inv=${p ? `"${p.name}"(rank=${p.rank},status=${p.status},cat=${p.productCategoryId})` : 'MISSING'} nameMatch=${nameMatches}`
      );
    });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

diag();
