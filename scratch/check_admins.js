const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const snap = await db.collection('users').where('isAdmin', '==', true).get();
    console.log('Admin users count:', snap.size);
    snap.docs.forEach(doc => {
      console.log(`Admin user: ${doc.id}, Email: ${doc.data().email}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
