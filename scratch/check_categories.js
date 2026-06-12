const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const snap = await db.collection('categories').get();
    console.log('Total categories in database:', snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(`Category ID: ${doc.id}, Name: ${data.name}, isActive: ${data.isActive}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
