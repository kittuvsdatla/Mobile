const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * - NativeWind v4
 * - @/ path alias (maps to ./src/) via resolveRequest hook
 */
const projectRoot = __dirname;
const srcDir = path.resolve(projectRoot, 'src');

const config = mergeConfig(getDefaultConfig(projectRoot), {
  resolver: {
    sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json'],

    /**
     * resolveRequest intercepts every import BEFORE Metro does its own lookup.
     * This correctly rewrites @/foo/bar → <projectRoot>/src/foo/bar
     * and then lets Metro resolve it as a normal file path.
     *
     * The extraNodeModules Proxy approach does NOT work for @/ because Metro
     * parses "@" as a scoped npm package namespace, not an alias prefix.
     */
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName.startsWith('@/')) {
        const newPath = path.resolve(srcDir, moduleName.slice(2));
        return context.resolveRequest(context, newPath, platform);
      }
      // Fall through to default Metro resolution for everything else
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
