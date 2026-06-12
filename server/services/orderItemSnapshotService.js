const { db } = require('../firebase/firebase-config');

function getProductCategoryIds(productData) {
  if (!productData) return [];
  if (Array.isArray(productData.categoryIds) && productData.categoryIds.length > 0) {
    return productData.categoryIds;
  }
  if (productData.categoryId) {
    return [productData.categoryId];
  }
  return [];
}

async function enrichOrderLineItem(item, variantData) {
  const productId = item.productId || item.product_id;
  const variantId = item.variantId || item.variant_id;
  const quantity = item.quantity;

  let productData = {};
  if (productId) {
    const productSnap = await db.collection('products').doc(productId).get();
    if (productSnap.exists) {
      productData = productSnap.data();
    }
  }

  const productName =
    productData.name || item.productName || item.name || '';
  const categoryIds = getProductCategoryIds(productData);
  const weight =
    variantData.weight ||
    variantData.name ||
    item.weight ||
    item.variant_name ||
    '';
  const unitPrice = variantData.price ?? item.unit_price ?? item.price ?? 0;
  const originalPrice =
    (typeof variantData.originalPrice === 'number'
      ? variantData.originalPrice
      : variantData.price) ??
    item.original_price ??
    unitPrice;

  return {
    ...item,
    productId,
    product_id: productId,
    variantId,
    variant_id: variantId,
    quantity,
    productName,
    name: productName,
    categoryIds,
    weight,
    variant_name: weight,
    price: unitPrice,
    unit_price: unitPrice,
    original_price: originalPrice,
    gstPercentage: variantData.gstPercentage ?? item.gstPercentage ?? 0,
    cessRate: variantData.cessRate ?? item.cessRate ?? 0,
    discount: variantData.discount ?? item.discount ?? 0,
  };
}

module.exports = {
  getProductCategoryIds,
  enrichOrderLineItem,
};
