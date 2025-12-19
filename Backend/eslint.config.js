// ESLint Flat Config (ESLint v9+)
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");
const importPlugin = require("eslint-plugin-import");
const unusedImports = require("eslint-plugin-unused-imports");

module.exports = [
  {
    // ignore generated coverage folders (both test/coverage and tests/coverage),
    // build outputs and JS files so ESLint focuses on TypeScript sources/tests
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "test/coverage/**",
      "tests/coverage/**",
      "jest.config.ts",
      "**/*.js",
      "types/mongoose-shim.d.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      // Formatting
      "prettier/prettier": "error",

      // General
      "no-console": "off",

      // Unused imports/vars
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/consistent-type-imports": "warn",

      // Imports
      "import/order": [
        "off",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
      "import/newline-after-import": "warn",
    },
  },
];
