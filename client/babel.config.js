// babel.config.js
// Purpose: Enable Reanimated plugin and react-native-dotenv for @env imports.
// Why: Make OPENAI_API_KEY available, and keep animations working.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['module:react-native-dotenv', { moduleName: '@env' }],
    ],
  };
};
