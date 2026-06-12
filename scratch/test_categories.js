const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const snap = await db.collection('categories').get();
    console.log('Categories count:', snap.size);
    snap.docs.forEach(doc => {
      console.log(`Category ID: ${doc.id}, Name: ${doc.data().name}, isActive: ${doc.data().isActive}`);
    });
  } catch (error) {
    console.error('Error running test:', error);
  }
  process.exit(0);
}

test();
