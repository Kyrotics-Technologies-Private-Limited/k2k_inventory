const { db } = require('../server/firebase/firebase-config');
const { assignProductToCategory, getCategoryProducts } = require('../server/services/categoryMembershipService');

async function test() {
  const catId = "B6y6gfxUqpA7MqU7pD87"; // Stone Grinding Atta (disabled category)
  const prodId = "gQrDjBHALohaVZxTRLor"; // Desi Ghee
  
  try {
    console.log('Assigning product to disabled category...');
    await assignProductToCategory(catId, prodId);
    
    console.log('Querying category products with activeOnly: false...');
    const products = await getCategoryProducts(catId, { activeOnly: false });
    console.log('Products found:', products.length);
    products.forEach(p => {
      console.log(`- Product Name: ${p.name}, Status: ${p.status}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
