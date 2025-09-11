// ESLint Flat Config (ESLint v9+)
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  // Ignore patterns
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "jest.config.ts"],
  },

  // Rules for TS/TSX files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.eslint.json", // این فایل باید وجود داشته باشه
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      // ✅ Prettier integration
      "prettier/prettier": "error",

      // ✅ General
      "no-console": "off",

      // ✅ TS best practices
      "no-unused-vars": "off", // غیرفعال چون با TS تداخل داره
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/consistent-type-imports": "warn",

      // ✅ Import rules (شبیه Airbnb ولی بدون dependency conflict)
      "import/order": [
        "warn",
        {
          groups: [
            "builtin", // node libs
            "external", // npm packages
            "internal", // alias paths
            ["parent", "sibling", "index"], // relative imports
          ],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
      "import/newline-after-import": "warn",
    },
  },
];
