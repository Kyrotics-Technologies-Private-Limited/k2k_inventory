const { db } = require('../firebase/firebase-config');

// Create Variant
exports.createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const variantData = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const units = typeof variantData.units_in_stock === "number" ? variantData.units_in_stock : 0;
    if (units < 0 || !Number.isInteger(units)) {
      return res.status(400).json({ error: 'units_in_stock must be a non-negative integer' });
    }

    if (variantData.price !== undefined) {
      const price = Number(variantData.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
      }
    }

    if (variantData.discount !== undefined) {
      const discount = Number(variantData.discount);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({ error: 'discount must be between 0 and 100' });
      }
    }

    if (variantData.gstPercentage !== undefined) {
      const gst = Number(variantData.gstPercentage);
      if (isNaN(gst) || gst < 0 || gst > 100) {
        return res.status(400).json({ error: 'gstPercentage must be between 0 and 100' });
      }
    }

    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Parent product not found' });
    }


    const inStock = units > 0;
    const { id, productId: _pId, ...dataToSave } = variantData;

    const variantRef = await productRef.collection('variants').add({
      ...dataToSave,
      units_in_stock: units,
      inStock: inStock,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      id: variantRef.id,
      productId,
      ...dataToSave,
      units_in_stock: units,
      inStock: inStock,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get All Variants for a Product
exports.getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    
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

// Get All Variants (across all products)
exports.getAllVariants = async (req, res) => {
  try {
    const productsSnapshot = await db.collection('products').get();
    const allVariants = [];

    for (const productDoc of productsSnapshot.docs) {
      const variantsSnapshot = await productDoc.ref.collection('variants').get();
      const variants = variantsSnapshot.docs.map(doc => ({
        id: doc.id,
        productId: productDoc.id,
        ...doc.data()
      }));
      allVariants.push(...variants);
    }

    res.status(200).json(allVariants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Single Variant
exports.getVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    
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

// Get Single Variant by ID across all products (collectionGroup query)
exports.getVariantById = async (req, res) => {
  try {
    const { variantId } = req.params;
    if (!variantId) {
      return res.status(400).json({ error: 'variantId is required' });
    }

    const snapshot = await db.collectionGroup('variants').get();
    const doc = snapshot.docs.find(d => d.id === variantId);
    if (!doc) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const parentProductRef = doc.ref.parent.parent;
    res.status(200).json({
      id: doc.id,
      productId: parentProductRef ? parentProductRef.id : null,
      ...doc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update Variant
exports.updateVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const updateData = req.body;

    if (!productId || !variantId) {
      return res.status(400).json({ error: 'productId and variantId are required' });
    }

    const variantRef = db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .doc(variantId);

    const existingDoc = await variantRef.get();
    if (!existingDoc.exists) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    const { id, productId: _pId, ...fieldsToUpdate } = updateData;

    // Validate units_in_stock only if explicitly provided; do not reset stock if omitted
    if (fieldsToUpdate.units_in_stock !== undefined) {
      const units = Number(fieldsToUpdate.units_in_stock);
      if (isNaN(units) || units < 0 || !Number.isInteger(units)) {
        return res.status(400).json({ error: 'units_in_stock must be a non-negative integer' });
      }
      fieldsToUpdate.units_in_stock = units;
      fieldsToUpdate.inStock = units > 0;
    }

    if (fieldsToUpdate.price !== undefined) {
      const price = Number(fieldsToUpdate.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'price must be a non-negative number' });
      }
      fieldsToUpdate.price = price;
    }

    if (fieldsToUpdate.discount !== undefined) {
      const discount = Number(fieldsToUpdate.discount);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return res.status(400).json({ error: 'discount must be between 0 and 100' });
      }
      fieldsToUpdate.discount = discount;
    }

    if (fieldsToUpdate.gstPercentage !== undefined) {
      const gst = Number(fieldsToUpdate.gstPercentage);
      if (isNaN(gst) || gst < 0 || gst > 100) {
        return res.status(400).json({ error: 'gstPercentage must be between 0 and 100' });
      }
      fieldsToUpdate.gstPercentage = gst;
    }

    fieldsToUpdate.updatedAt = new Date();

    await variantRef.update(fieldsToUpdate);

    res.status(200).json({ 
      id: variantId,
      productId,
      ...existingDoc.data(),
      ...fieldsToUpdate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete Variant
exports.deleteVariant = async (req, res) => {
  try {
    const { productId, variantId } = req.params;

    const variantRef = db
      .collection('products')
      .doc(productId)
      .collection('variants')
      .doc(variantId);

    const existingDoc = await variantRef.get();
    if (!existingDoc.exists) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    await variantRef.delete();

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
