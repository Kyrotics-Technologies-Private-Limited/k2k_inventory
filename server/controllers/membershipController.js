const { db } = require('../firebase/firebase-config');

// Create a new membership type with pricing and duration
exports.createMembership = async (req, res) => {
  try {
    const { 
      type, 
      description, 
      price, 
      duration, 
      discountPercentage 
    } = req.body;
    
    const newMembership = {
      type,
      description,
      price: Number(price),
      duration: Number(duration), // in months
      discountPercentage: Number(discountPercentage),
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
    const snapshot = await db.collection('membership').orderBy('duration', 'asc').get();
    const memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(memberships);
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
    if (updates.price) updates.price = Number(updates.price);
    if (updates.duration) updates.duration = Number(updates.duration);
    if (updates.discountPercentage) updates.discountPercentage = Number(updates.discountPercentage);
    
    await db.collection('membership').doc(membershipId).update(updates);
    res.status(200).json({ id: membershipId, ...updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buy membership (for a user)
exports.buyMembership = async (req, res) => {
  try {
    const { userId, membershipId } = req.body;
    
    // Get membership details
    const membershipDoc = await db.collection('membership').doc(membershipId).get();
    if (!membershipDoc.exists) {
      return res.status(404).json({ error: 'Membership not found' });
    }
    
    const membershipData = membershipDoc.data();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + membershipData.duration);
    
    await db.collection('users').doc(userId).collection('memberships').doc(membershipId).set({
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
    const { userId, membershipId } = req.body;
    await db.collection('users').doc(userId).collection('memberships').doc(membershipId).update({
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
    const snapshot = await db.collection('users').doc(userId).collection('memberships')
      .where('active', '==', true)
      .get();
    
    const memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(memberships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};