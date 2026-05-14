const { db, FieldValue } = require('../firebase/firebase-config');
const {
  createProductWithTraceabilityRootTransaction,
  syncTraceabilityRootFromProduct,
  markTraceabilityRootDeletedForProduct,
} = require('../services/traceabilityRootService');

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const product = { ...req.body };
    delete product.id;
    console.log('Creating product:', JSON.stringify(product, null, 2)); // Debug log

    // Validate and Fetch Categories if categoryIds are provided
    if (product.categoryIds && Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
      const categoryNames = [];
      for (const catId of product.categoryIds) {
        const categoryDoc = await db.collection('categories').doc(catId).get();
        if (categoryDoc.exists) {
          categoryNames.push(categoryDoc.data().name);
        }
      }
      
      if (product.categoryIds.length === 1) {
        product.category = categoryNames[0];
        product.categoryId = product.categoryIds[0];
        delete product.categories;
        delete product.categoryIds;
      } else {
        product.categories = categoryNames;
        // product.categoryIds is already present in product
        delete product.category;
        delete product.categoryId;
      }
    } else {
      product.categories = [];
      product.categoryIds = [];
      delete product.category;
      delete product.categoryId;
    }

    const productRef = db.collection('products').doc();
    const rootRef = db.collection('productCategory').doc();

    await createProductWithTraceabilityRootTransaction(productRef, rootRef, product);

    const saved = { id: productRef.id, ...product, traceabilityDocId: rootRef.id };
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const snapshot = await db.collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = req.body;
    console.log('Updating product:', JSON.stringify(product, null, 2)); // Debug log

    // Validate and Update Categories if categoryIds are provided
    if (product.categoryIds && Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
      const categoryNames = [];
      for (const catId of product.categoryIds) {
        const categoryDoc = await db.collection('categories').doc(catId).get();
        if (categoryDoc.exists) {
          categoryNames.push(categoryDoc.data().name);
        }
      }

      if (product.categoryIds.length === 1) {
        product.category = categoryNames[0];
        product.categoryId = product.categoryIds[0];
        product.categories = FieldValue.delete();
        product.categoryIds = FieldValue.delete();
      } else {
        product.categories = categoryNames;
        // product.categoryIds is already present in product
        product.category = FieldValue.delete();
        product.categoryId = FieldValue.delete();
      }
    } else if (product.categoryIds && Array.isArray(product.categoryIds) && product.categoryIds.length === 0) {
      product.categories = [];
      product.categoryIds = [];
      product.category = FieldValue.delete();
      product.categoryId = FieldValue.delete();
    }

    await db.collection('products').doc(id).update(product);

    try {
      await syncTraceabilityRootFromProduct(id);
    } catch (syncErr) {
      console.error('Traceability snapshot sync failed:', syncErr.message);
    }

    res.status(200).json({ id, ...product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await markTraceabilityRootDeletedForProduct(id);
    } catch (markErr) {
      console.error('Traceability root tombstone failed:', markErr.message);
    }
    await db.collection('products').doc(id).delete();
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.collection('products').doc(id).get();

    if (!product.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ id: product.id, ...product.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


