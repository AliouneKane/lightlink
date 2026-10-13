const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// The framework-free energy model is shared with the Next.js app.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, "../shared"),
];
module.exports = config;
