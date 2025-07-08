const { db } = require('../firebase/firebase-config');

// Create Variant
exports.createVariant = async (req, res) => {
  try {
    const { productId } = req.params; // Get the productId from params (ensure you're passing it in the URL)
    const variantData = req.body; // Get the variant data from request body
    
    // Reference to the product document
    const productRef = db.collection('products').doc(productId);
    
    // Create a subcollection 'variants' under the product
    const variantRef = await productRef.collection('variants').add({
      ...variantData,
      units_in_stock: variantData.units_in_stock || 0,
      createdAt: new Date()
    });

    res.status(201).json({
      id: variantRef.id, 
      productId,
      ...variantData,
      units_in_stock: variantData.units_in_stock || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Variants for a Product
exports.getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;  // Get the productId from params
    
    const variantsSnapshot = await db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .get();

    const variants = variantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(variants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Variant
exports.getVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;  // Get productId and variantId
    
    const variantDoc = await db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .doc(variantId)
      .get();

    if (!variantDoc.exists) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.status(200).json({
      id: variantDoc.id,
      ...variantDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Variant
exports.updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;  // Get productId and variantId
    const updateData = req.body;  // Get update data from the request body

    await db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .doc(variantId)
      .update({
        ...updateData,
        units_in_stock: updateData.units_in_stock || 0,
        updatedAt: new Date()
      });

    res.status(200).json({ 
      id: variantId,
      productId,
      ...updateData,
      units_in_stock: updateData.units_in_stock || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Variant
exports.deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    console.log("Deleting variant:", variantId, "from product:", productId);

    await db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .doc(variantId)
      .delete();

    console.log("Deleted successfully");

    res.status(200).json({ 
      message: 'Variant deleted successfully',
      productId,
      variantId
    });
  } catch (error) {
    console.error("Error deleting variant:", error);
    res.status(500).json({ error: error.message });
  }
};
