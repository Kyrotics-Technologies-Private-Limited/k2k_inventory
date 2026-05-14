/** Firestore collection + schema constants for inventory ↔ traceability linking */

exports.COLLECTION_PRODUCTS = 'products';
exports.COLLECTION_TRACEABILITY_ROOTS = 'productCategory';

exports.ENTITY_TYPE_TRACEABILITY_ROOT = 'traceability_root';

/** Bump when product inventory schema shape for linking changes */
exports.PRODUCT_SCHEMA_VERSION = 2;

/** Bump when traceability root snapshot / linking fields change */
exports.TRACEABILITY_ROOT_SCHEMA_VERSION = 2;
