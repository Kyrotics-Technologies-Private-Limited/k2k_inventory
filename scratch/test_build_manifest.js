const { buildCatalogManifest } = require('../server/services/catalogManifestService');

async function test() {
  try {
    console.log('Building manifest...');
    const manifest = await buildCatalogManifest();
    console.log('Manifest built successfully! Version:', manifest.version);
  } catch (error) {
    console.error('Error building manifest:', error);
  }
  process.exit(0);
}

test();
