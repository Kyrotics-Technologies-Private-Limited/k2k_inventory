const { db } = require('../firebase/firebase-config');

// Create Product
exports.createProduct = async (req, res) => {
  try {
    const product = req.body;
    console.log('Creating product:', JSON.stringify(product, null, 2)); // Debug log
    const docRef = await db.collection('products').add(product);
    res.status(201).json({ id: docRef.id, ...product });
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
    await db.collection('products').doc(id).update(product);
    res.status(200).json({ id, ...product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
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


