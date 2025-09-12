// eslint.config.js
const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const prettierPlugin = require("eslint-plugin-prettier");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");

let nextPlugin = null;
let nextConfig = null;
try {
  nextPlugin = require("@next/eslint-plugin-next");
} catch (e) {
  // plugin not installed — continue without it
}
try {
  nextConfig = require("eslint-config-next");
} catch (e) {
  // config not installed — continue
}

const baseRecommendedRules = {
  ...js.configs.recommended.rules,
  ...tsPlugin.configs.recommended.rules,
  ...(nextConfig && nextConfig.configs && nextConfig.configs.recommended
    ? nextConfig.configs.recommended.rules
    : {}),
};

module.exports = [
  {
    ignores: [
      ".next/",
      "node_modules/",
      "dist/",
      "build/",
      "next-env.d.ts",
      "next.config.js",
      "prettier.config.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // point to dedicated tsconfig for eslint
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
        React: "readonly",
        JSX: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      prettier: prettierPlugin,
      ...(nextPlugin ? { next: nextPlugin } : {}),
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./tsconfig.eslint.json" },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
    rules: {
      ...baseRecommendedRules,

      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",

      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-boolean-value": ["warn", "never"],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [
            { pattern: "@mui/**", group: "external", position: "after" },
            { pattern: "@/**", group: "internal", position: "after" },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],

      "no-alert": "warn",
      "no-console": "off",

      "prettier/prettier": "warn",
    },
  },
];
