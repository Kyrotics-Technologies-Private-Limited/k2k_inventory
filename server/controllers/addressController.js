const admin = require('firebase-admin');
const db = admin.firestore();

const COLLECTION = 'addresses';

exports.getAllAddresses = async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION)
      .where('userId', '==', req.user.uid).get();

    const addresses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

exports.createAddress = async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      userId: req.user.uid,
      createdAt: new Date().toISOString(),
      isDefault: false,
    };

    const newDoc = await db.collection(COLLECTION).add(addressData);
    res.status(201).json({ id: newDoc.id, ...addressData });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create address' });
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();

    if (!doc.exists || doc.data().userId !== req.user.uid) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch address' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists || doc.data().userId !== req.user.uid) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await ref.update(req.body);
    res.json({ message: 'Address updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update address' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists || doc.data().userId !== req.user.uid) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await ref.delete();
    res.json({ message: 'Address deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.uid;
    const targetId = req.params.id;

    const targetRef = db.collection(COLLECTION).doc(targetId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists || targetDoc.data().userId !== userId) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Remove existing default
    const snapshot = await db.collection(COLLECTION)
      .where('userId', '==', userId)
      .where('isDefault', '==', true)
      .get();

    const batch = db.batch();

    snapshot.forEach(doc => {
      batch.update(doc.ref, { isDefault: false });
    });

    // Set new default
    batch.update(targetRef, { isDefault: true });
    await batch.commit();

    res.json({ message: 'Default address updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set default address' });
  }
};
