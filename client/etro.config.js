// client/metro.config.js
// Enable .svg imports via react-native-svg-transformer
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Use the SVG transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Tell Metro to treat .svg as source, not asset
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

module.exports = config;
