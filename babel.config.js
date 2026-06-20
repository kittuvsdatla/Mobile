module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    // NativeWind v4: must be in presets (not plugins) — it returns { plugins: [...] }
    'nativewind/babel',
  ],
  plugins: [
    // Reanimated plugin must be last
    'react-native-reanimated/plugin',
  ],
};
