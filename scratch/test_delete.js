const { db } = require('../server/firebase/firebase-config');
const { buildCatalogManifest } = require('../server/services/catalogManifestService');

async function test() {
  try {
    const id = '5lj4k2BLxWxoXEq65aDN'; // A2-Desi Ghee
    const docRef = db.collection('categories').doc(id);
    console.log('Deactivating category...');
    await docRef.update({
      isActive: false,
      updatedBy: 'system-test',
      updatedAt: new Date(),
    });

    console.log('Building manifest with deactivated category...');
    const manifest = await buildCatalogManifest();
    console.log('Manifest built successfully! Version:', manifest.version);

    // Revert back to active
    await docRef.update({
      isActive: true,
      updatedBy: 'system-test',
      updatedAt: new Date(),
    });
    console.log('Revert successful!');
  } catch (error) {
    console.error('Error during test:', error);
    // Always attempt to revert
    try {
      const id = '5lj4k2BLxWxoXEq65aDN';
      await db.collection('categories').doc(id).update({
        isActive: true,
        updatedBy: 'system-test',
        updatedAt: new Date(),
      });
      console.log('Successfully reverted after error');
    } catch (revertError) {
      console.error('Failed to revert:', revertError);
    }
  }
  process.exit(0);
}

test();
