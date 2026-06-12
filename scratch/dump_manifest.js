const { db } = require('../server/firebase/firebase-config');

async function dump() {
  try {
    const doc = await db.collection('catalogManifest').doc('latest').get();
    if (doc.exists) {
      console.log('Manifest latest:', JSON.stringify(doc.data(), null, 2));
    } else {
      console.log('No manifest found.');
    }
  } catch (error) {
    console.error('Error dumping manifest:', error);
  }
  process.exit(0);
}

dump();
