const { db } = require('../firebase/firebase-config');

// Create Category
exports.createCategory = async (req, res) => {
    try {
        const { name, key } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Optional: Check if category with same name exists
        const existingCategory = await db.collection('categories').where('name', '==', name).get();
        if (!existingCategory.empty) {
            return res.status(400).json({ error: 'Category with this name already exists' });
        }

        const categoryData = {
            name,
            key: key || name.toLowerCase().replace(/\s+/g, '-'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection('categories').add(categoryData);
        res.status(201).json({ id: docRef.id, ...categoryData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Categories
exports.getAllCategories = async (req, res) => {
    try {
        const snapshot = await db.collection('categories').get();
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, key } = req.body;

        const updates = {
            updatedAt: new Date().toISOString()
        };

        if (name) updates.name = name;
        if (key) updates.key = key;

        await db.collection('categories').doc(id).update(updates);
        res.status(200).json({ id, ...updates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete Category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any products use this category before deleting (Optional safety check)
        const productsUsingCategory = await db.collection('products').where('categoryId', '==', id).limit(1).get();
        if (!productsUsingCategory.empty) {
            return res.status(400).json({ error: 'Cannot delete category because it is used by existing products.' });
        }

        await db.collection('categories').doc(id).delete();
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
