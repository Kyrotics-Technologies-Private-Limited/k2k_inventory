const {
  buildCatalogManifest,
  getManifest,
} = require('../services/catalogManifestService');

exports.getManifest = async (req, res) => {
  try {
    let manifest = await getManifest();

    if (!manifest) {
      manifest = await buildCatalogManifest();
    }

    res.status(200).json(manifest);
  } catch (error) {
    console.error('getManifest error:', error);
    res.status(500).json({
      error: 'Failed to load catalog manifest',
      message: error.message,
    });
  }
};

exports.rebuildManifest = async (req, res) => {
  try {
    const manifest = await buildCatalogManifest();
    res.status(200).json(manifest);
  } catch (error) {
    console.error('rebuildManifest error:', error);
    res.status(500).json({
      error: 'Manifest rebuild failed',
      message: error.message,
    });
  }
};
