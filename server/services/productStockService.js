const { db } = require('../firebase/firebase-config');

const PRODUCTS = 'products';
const LOW_STOCK_THRESHOLD = 5;

function getVariantUnits(variantData) {
  if (typeof variantData.units_in_stock === 'number') {
    return variantData.units_in_stock;
  }
  if (typeof variantData.quantity === 'number') {
    return variantData.quantity;
  }
  return 0;
}

function deriveStockStatusFromTotalUnits(totalUnits) {
  if (totalUnits <= 0) return 'out_of_stock';
  if (totalUnits <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

function deriveStockStatusFromVariants(variantDataList) {
  const total = variantDataList.reduce((sum, v) => sum + getVariantUnits(v), 0);
  return deriveStockStatusFromTotalUnits(total);
}

async function fetchVariantsForProduct(productId) {
  const snap = await db.collection(PRODUCTS).doc(productId).collection('variants').get();
  return snap.docs.map((doc) => doc.data());
}

async function attachStockStatus(product) {
  if (!product?.id) return product;

  const variants = await fetchVariantsForProduct(product.id);
  return {
    ...product,
    stockStatus: deriveStockStatusFromVariants(variants),
  };
}

async function attachStockStatusToMany(products) {
  if (!products?.length) return products;
  return Promise.all(products.map((p) => attachStockStatus(p)));
}

function stripStockFieldsFromWrite(body) {
  if (!body || typeof body !== 'object') return body;
  const cleaned = { ...body };
  delete cleaned.stockStatus;
  delete cleaned.stock;
  delete cleaned.units_in_stock;
  return cleaned;
}

module.exports = {
  LOW_STOCK_THRESHOLD,
  deriveStockStatusFromVariants,
  attachStockStatus,
  attachStockStatusToMany,
  stripStockFieldsFromWrite,
};
