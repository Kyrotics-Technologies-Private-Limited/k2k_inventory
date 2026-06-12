const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const snap = await db.collection('users').get();
    console.log('Total users:', snap.size);
    snap.docs.forEach(doc => {
      console.log(`User ID: ${doc.id}, Data:`, doc.data());
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
