const { db } = require('../server/firebase/firebase-config');

async function test() {
  const catId = "B6y6gfxUqpA7MqU7pD87"; // Stone Grinding Atta
  try {
    const memSnap = await db.collection('categories').doc(catId).collection('products').get();
    console.log(`Memberships in Stone Grinding Atta (ID: ${catId}):`, memSnap.size);
    memSnap.docs.forEach(doc => {
      console.log(`Product ID in category: ${doc.id}, data:`, doc.data());
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
