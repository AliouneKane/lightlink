import { defineConfig } from "eslint/config";
import expo from "eslint-config-expo/flat.js";
export default defineConfig([
  expo,
  {
    ignores: [
      "dist/**",
      ".expo/**",
      "artifacts/**",
      "test-results/**",
      "playwright-report/**",
      "expo-env.d.ts",
    ],
  },
]);
