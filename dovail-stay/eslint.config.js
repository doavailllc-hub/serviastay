// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/**", ".expo/**", "android/**", "android_backup/**"],
    rules: {
      // Async screen loaders intentionally update state after their awaited work.
      "react-hooks/set-state-in-effect": "off",
      // Event handlers may generate timestamps and optimistic identifiers.
      "react-hooks/purity": "off",
      // Keep legacy findings visible while allowing CI to adopt lint incrementally.
      "react-hooks/immutability": "warn",
      "react/no-children-prop": "warn",
    },
  }
]);
