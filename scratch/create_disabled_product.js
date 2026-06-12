const { db } = require('../server/firebase/firebase-config');

async function test() {
  try {
    const productData = {
      name: "TEST HIDDEN PRODUCT",
      price: { amount: 150, currency: "INR" },
      description: "This is a disabled/hidden test product",
      categoryIds: ["OdTdM6zwrtZrK1EH0wn9"], // Wood Pressed Oil
      status: "hidden", // Inactive status
      rank: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('products').add(productData);
    console.log('Test product created with ID:', docRef.id);
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
