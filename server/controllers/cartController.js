const { db } = require("../firebase/firebase-config");

// Create a new cart
exports.createCart = async (req, res) => {
  try {
    const cartData = {
      createdAt: new Date(),
    };

    if (req.user) {
      cartData.userId = req.user.uid;
    }

    const cartRef = await db.collection("carts").add(cartData);
    res.status(201).json({ id: cartRef.id, ...cartData });
  } catch (error) {
    console.error("Error creating cart:", error);
    res.status(500).json({ error: "Failed to create cart" });
  }
};

// Get all carts
exports.getCarts = async (req, res) => {
  try {
    const cartsSnapshot = await db.collection("carts").get();
    const carts = cartsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(carts);
  } catch (error) {
    console.error("Error fetching carts:", error);
    res.status(500).json({ error: "Failed to fetch carts" });
  }
};

// Get a single cart by ID
exports.getCartById = async (req, res) => {
  try {
    const { id } = req.params;
    const cartDoc = await db.collection("carts").doc(id).get();

    if (!cartDoc.exists) {
      return res.status(404).json({ error: "Cart not found" });
    }

    res.status(200).json({ id: cartDoc.id, ...cartDoc.data() });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

// Get a  cart by user ID
exports.getUserCart = async (req, res) => {
  try {
    const userId = req.user.uid;
  
    const cartQuery = await db
      .collection("carts")
      .where("userId", "==", userId)
      .limit(1)
      .get();
  
    // If cart exists, return it
    if (!cartQuery.empty) {
      const cartDoc = cartQuery.docs[0];
      return res.status(200).json({ id: cartDoc.id, ...cartDoc.data() });
    }
  
    // If not, create a new cart
    const newCart = {
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  
    const cartRef = await db.collection("carts").add(newCart);
    return res.status(201).json({ id: cartRef.id, ...newCart });
  
  } catch (error) {
    console.error("Error getting or creating cart:", error);
    res.status(500).json({ error: "Failed to get or create cart" });
  }
};

// Update a cart by ID
exports.updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const cartData = {
      updatedAt: new Date(),
    };

    await db.collection("carts").doc(id).update(cartData);
    res.status(200).json({ id, ...cartData });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart" });
  }
};

// Delete a cart by ID
exports.deleteCart = async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection("carts").doc(id).delete();
    res.status(200).json({ message: "Cart deleted successfully" });
  } catch (error) {
    console.error("Error deleting cart:", error);
    res.status(500).json({ error: "Failed to delete cart" });
  }
};

// Get cart items
exports.getCartItems = async (req, res) => {
  try {
    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({ error: "Missing cart ID in request params" });
    }

    const cartItemsSnapshot = await db
      .collection("carts")
      .doc(cartId)
      .collection("cartItems")
      .get();

    if (cartItemsSnapshot.empty) {
      return res.status(404).json({ error: "Cart items not found" });
    }

    const cartItems = cartItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(cartItems);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

// Add a cart item
exports.addCartItem = async (req, res) => {
  try {
    const { cartId } = req.params;
    if (!cartId) {
      return res.status(400).json({ error: "Missing cart ID in request params" });
    }

    const cartItemData = req.body;
    const { productId, variantId, quantity } = cartItemData;

    // Check if an item with the same product and variant already exists
    const existingItemSnapshot = await db
      .collection("carts")
      .doc(cartId)
      .collection("cartItems")
      .where("productId", "==", productId)
      .where("variantId", "==", variantId)
      .limit(1)
      .get();

    let cartItemRef;
    let updatedCartItem;

    if (!existingItemSnapshot.empty) {
      // Update existing item's quantity
      cartItemRef = existingItemSnapshot.docs[0].ref;
      const existingItem = existingItemSnapshot.docs[0].data();
      updatedCartItem = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
        updatedAt: new Date()
      };
      await cartItemRef.update(updatedCartItem);
    } else {
      // Add new item
      updatedCartItem = {
        ...cartItemData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      cartItemRef = await db
        .collection("carts")
        .doc(cartId)
        .collection("cartItems")
        .add(updatedCartItem);
    }

    // Update cart's updatedAt timestamp
    await db.collection("carts").doc(cartId).update({
      updatedAt: new Date(),
    });

    res.status(201).json({ 
      id: cartItemRef.id, 
      ...updatedCartItem
    });
  } catch (error) {
    console.error("Error adding cart item:", error);
    res.status(500).json({ error: "Failed to add cart item" });
  }
};

// Update a cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;
    const cartItemData = req.body;

    const updatedCartItem = {
      ...cartItemData,
      updatedAt: new Date(),
    };

    await db
      .collection("carts")
      .doc(cartId)
      .collection("cartItems")
      .doc(itemId)
      .update(updatedCartItem);

    // Update 'updatedAt' in parent cart
    await db.collection("carts").doc(cartId).update({
      updatedAt: new Date(),
    });

    res.status(200).json({ id: itemId, ...updatedCartItem });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ error: "Failed to update cart item" });
  }
};

// Remove a cart item
exports.removeCartItem = async (req, res) => {
  try {
    const { cartId, itemId } = req.params;

    await db
      .collection("carts")
      .doc(cartId)
      .collection("cartItems")
      .doc(itemId)
      .delete();

    // Update 'updatedAt' in parent cart
    await db.collection("carts").doc(cartId).update({
      updatedAt: new Date(),
    });

    res.status(200).json({ message: "Cart item removed successfully" });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
};

