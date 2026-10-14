/** Firestore collection + schema constants for inventory ↔ traceability linking */

exports.COLLECTION_PRODUCTS = 'products';
exports.COLLECTION_TRACEABILITY_ROOTS = 'productCategory';

/** Registry of allocated / retired traceability product codes (doc id = code) */
exports.COLLECTION_PRODUCT_CODES = 'productCodes';
/** Atomic sequence documents (e.g. product-code allocation) */
exports.COLLECTION_COUNTERS = 'counters';
exports.PRODUCT_CODE_COUNTER_DOC = 'productCode';

exports.ENTITY_TYPE_TRACEABILITY_ROOT = 'traceability_root';

/**
 * Permanent 3-digit product code (e.g. "001"). Printed on the bottle/jar and
 * embedded as the first segment of the 13-digit traceability code:
 *   productCode(3) + batch(5) + packet(5)
 * It is NOT the UI rank. It is assigned once and (normally) never changes.
 */
exports.PRODUCT_CODE_LENGTH = 3;

/** Bump when product inventory schema shape for linking changes */
exports.PRODUCT_SCHEMA_VERSION = 3;

/** Bump when traceability root snapshot / linking fields change */
exports.TRACEABILITY_ROOT_SCHEMA_VERSION = 3;
