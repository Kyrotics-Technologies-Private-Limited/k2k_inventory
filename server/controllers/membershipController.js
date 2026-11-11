const { db } = require('../firebase/firebase-config');

// Create a new membership type with pricing and duration
exports.createMembership = async (req, res) => {
  try {
    const { 
      type, 
      description, 
      originalPrice,
      price, 
      duration, 
      discountPercentage,
      isActive
    } = req.body;
    
    const newMembership = {
      type,
      description,
      originalPrice: Number(originalPrice ?? price),
      price: Number(price),
      duration: Number(duration), // in months
      discountPercentage: Number(discountPercentage),
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('membership').add(newMembership);
    const createdMembership = { id: docRef.id, ...newMembership };
    res.status(201).json(createdMembership);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all memberships
exports.getMemberships = async (req, res) => {
  try {
    const { all, admin, active } = req.query;
    const snapshot = await db.collection('membership').orderBy('duration', 'asc').get();
    let memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Admin panel requesting all memberships
    if (all === 'true' || admin === 'true') {
      return res.status(200).json(memberships);
    }

    // Explicit active=false filter
    if (active === 'false') {
      return res.status(200).json(memberships.filter(m => m.isActive === false));
    }

    // Default (Storefront): only return active memberships (excluding disabled)
    const activeMemberships = memberships.filter(m => m.isActive !== false);
    res.status(200).json(activeMemberships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single membership by ID
exports.getMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const doc = await db.collection('membership').doc(membershipId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a membership type
exports.deleteMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    await db.collection('membership').doc(membershipId).delete();
    res.status(200).json({ message: 'Membership deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a membership type
exports.updateMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const updates = {
      ...req.body,
      updatedAt: new Date()
    };
    
    // Convert numeric fields
    if (updates.originalPrice !== undefined) updates.originalPrice = Number(updates.originalPrice);
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.duration !== undefined) updates.duration = Number(updates.duration);
    if (updates.discountPercentage !== undefined) updates.discountPercentage = Number(updates.discountPercentage);
    if (updates.isActive !== undefined) updates.isActive = Boolean(updates.isActive);
    
    await db.collection('membership').doc(membershipId).update(updates);
    res.status(200).json({ id: membershipId, ...updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buy membership (for a user)
exports.buyMembership = async (req, res) => {
  try {
    const targetUserId = req.body.userId || req.user?.uid;
    const { membershipId } = req.body;

    // Cross-user authorization check
    if (req.user && !req.user.isAdmin && targetUserId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden - Cannot buy membership for another user' });
    }

    if (!targetUserId || !membershipId) {
      return res.status(400).json({ error: 'userId and membershipId are required' });
    }
    
    // Get membership details
    const membershipDoc = await db.collection('membership').doc(membershipId).get();
    if (!membershipDoc.exists) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    const membershipData = membershipDoc.data();
    if (membershipData.isActive === false) {
      return res.status(400).json({ error: 'This membership plan is currently disabled and unavailable for purchase.' });
    }
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (membershipData.duration || 1));
    
    await db.collection('users').doc(targetUserId).collection('memberships').doc(membershipId).set({
      active: true,
      purchasedAt: new Date(),
      expiresAt: expiryDate,
      membershipType: membershipData.type,
      discountPercentage: membershipData.discountPercentage
    });
    
    res.status(200).json({ 
      message: 'Membership purchased successfully',
      expiresAt: expiryDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel membership (for a user)
exports.cancelMembership = async (req, res) => {
  try {
    const targetUserId = req.body.userId || req.user?.uid;
    const { membershipId } = req.body;

    // Cross-user authorization check
    if (req.user && !req.user.isAdmin && targetUserId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden - Cannot cancel membership for another user' });
    }

    if (!targetUserId || !membershipId) {
      return res.status(400).json({ error: 'userId and membershipId are required' });
    }

    await db.collection('users').doc(targetUserId).collection('memberships').doc(membershipId).update({
      active: false,
      cancelledAt: new Date()
    });
    res.status(200).json({ message: 'Membership cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's active memberships
exports.getUserMemberships = async (req, res) => {
  try {
    const { userId } = req.params;

    // Cross-user authorization check
    if (req.user && !req.user.isAdmin && userId !== req.user.uid) {
      return res.status(403).json({ error: 'Forbidden - Cannot access another user memberships' });
    }
    
    // Get the user document first
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Check if user is a member
    if (userData.isMember) {
      // If you want to return the user's membership info
      const membership = { id: userDoc.id, ...userData };
      res.status(200).json([membership]);
    } else {
      // User is not a member
      res.status(200).json([]);
    }
  } catch (error) {
    console.error("Error in getUserMemberships:", error);
    res.status(500).json({ error: error.message });
  }
};
