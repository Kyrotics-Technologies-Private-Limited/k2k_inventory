const { db } = require('../server/firebase/firebase-config');
const { removeProductFromCategory } = require('../server/services/categoryMembershipService');

async function test() {
  const catId = "B6y6gfxUqpA7MqU7pD87";
  const prodId = "gQrDjBHALohaVZxTRLor";
  const testProductId = "ZwGHYSLuVGAmQjnUFBAS";
  
  try {
    console.log('Cleaning up category assignment...');
    await removeProductFromCategory(catId, prodId);
    
    console.log('Deleting test product...');
    await db.collection('products').doc(testProductId).delete();
    
    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  process.exit(0);
}

test();
