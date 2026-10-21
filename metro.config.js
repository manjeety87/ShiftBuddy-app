const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// lucide-react-native (aur kuch aur packages) ke .mjs exports resolve
// karne ke liye ye zaroori hai — Metro ka package "exports" field handling
// abhi kuch libraries ke saath conflict karta hai
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });