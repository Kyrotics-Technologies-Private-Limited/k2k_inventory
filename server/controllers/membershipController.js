// Create a new membership type
exports.createMembership = async (req, res) => {
  try {
    const { type, description } = req.body;
    const docRef = await db.collection('memberships').add({ type, description });
    const newMembership = { id: docRef.id, type, description };
    res.status(201).json(newMembership);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all memberships
exports.getMemberships = async (req, res) => {
  try {
    const snapshot = await db.collection('memberships').get();
    const memberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(memberships);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a membership type
exports.deleteMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    await db.collection('memberships').doc(membershipId).delete();
    res.status(200).json({ message: 'Membership deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a membership type
exports.updateMembership = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const updates = req.body;
    await db.collection('memberships').doc(membershipId).update(updates);
    res.status(200).json({ id: membershipId, ...updates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buy membership (for a user)
exports.buyMembership = async (req, res) => {
  try {
    const { userId, membershipId } = req.body;
    await db.collection('users').doc(userId).collection('memberships').doc(membershipId).set({ active: true, purchasedAt: new Date() });
    res.status(200).json({ message: 'Membership purchased' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel membership (for a user)
exports.cancelMembership = async (req, res) => {
  try {
    const { userId, membershipId } = req.body;
    await db.collection('users').doc(userId).collection('memberships').doc(membershipId).update({ active: false, cancelledAt: new Date() });
    res.status(200).json({ message: 'Membership cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const { db } = require('../firebase/firebase-config');

const MEMBERSHIP_SETTINGS_DOC = "kishanParivar";
const settingsRef = db.collection('settings').doc(MEMBERSHIP_SETTINGS_DOC);

exports.getMembershipSettings = async (req, res) => {
  try {
    const doc = await settingsRef.get();
    if (!doc.exists) {
      return res.status(404).send('Membership settings not found');
    }
    res.status(200).json(doc.data());
  } catch (error) {
    console.error('Error getting membership settings:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.updateMembershipSettings = async (req, res) => {
  try {
    const settings = req.body;
    await settingsRef.set({
      ...settings,
      updatedAt: new Date(),
    }, { merge: true });
    res.status(200).send('Membership settings updated successfully');
  } catch (error) {
    console.error('Error updating membership settings:', error);
    res.status(500).send('Internal Server Error');
  }
};