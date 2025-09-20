import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores([
    "**/*.d.ts",
    "**/*.d.ts.map",
    "**/dist/**",
    "**/node_modules/**",
  ]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      prettier,
    },
    rules: {
      "no-console": "off",

      // Let Prettier handle formatting
      "prettier/prettier": [
        "error",
        {
          singleQuote: false, // use double quotes
          trailingComma: "all", // always add trailing commas
          endOfLine: "auto",
        },
      ],
    },
  },
  configPrettier, // disables rules that conflict with Prettier
]);
