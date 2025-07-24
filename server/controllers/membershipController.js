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