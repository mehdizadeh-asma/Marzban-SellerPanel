const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const prettierPlugin = require("eslint-plugin-prettier");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");
const unusedImports = require("eslint-plugin-unused-imports");

let nextConfig = null;
let nextPlugin = null;
try {
  nextConfig = require("eslint-config-next");
} catch {}
try {
  nextPlugin = require("@next/eslint-plugin-next");
} catch {}

let jsoncParser = null;
let jsoncPlugin = null;
try {
  jsoncParser = require("jsonc-eslint-parser");
} catch {}
try {
  jsoncPlugin = require("eslint-plugin-jsonc");
} catch {}

let yamlParser = null;
let ymlPlugin = null;
try {
  yamlParser = require("yaml-eslint-parser");
} catch {}
try {
  ymlPlugin = require("eslint-plugin-yml");
} catch {}

let mdxPlugin = null;
let mdPlugin = null;
let mdProcessorEntry = null;
try {
  mdxPlugin = require("eslint-plugin-mdx");
} catch {}
try {
  mdPlugin = require("@eslint/markdown");
  if (mdPlugin && mdPlugin.processors) {
    const keys = Object.keys(mdPlugin.processors);
    if (keys.length > 0) mdProcessorEntry = keys[0];
  }
} catch {}

let htmlPlugin = null;
try {
  htmlPlugin = require("eslint-plugin-html");
} catch {}

const baseRecommendedRules = {
  ...js.configs.recommended.rules,
  ...tsPlugin.configs.recommended.rules,
  ...(nextConfig && nextConfig.configs && nextConfig.configs.recommended
    ? nextConfig.configs.recommended.rules
    : {}),
};

module.exports = [
  {
    plugins: {
      ...(nextPlugin ? { next: nextPlugin } : {}),
    },
    ...(nextConfig && nextConfig.configs && nextConfig.configs.recommended
      ? { rules: nextConfig.configs.recommended.rules }
      : {}),
  },

  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "next-env.d.ts",
      "next.config.js",
      "jest.config.js",
      "prettier.config.js",
      "eslint.config.cjs",
    ],
  },

  {
    files: ["**/*.{ts,tsx,js,jsx,cjs,mjs}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
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
      "unused-imports": unusedImports,
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

      // Unused imports/vars
      "@typescript-eslint/no-unused-vars": "warn",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/consistent-type-imports": "warn",

      // React
      "react/jsx-uses-react": "warn",
      "react/react-in-jsx-scope": "warn",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-boolean-value": ["warn", "never"],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import
      "import/order": [
        "off",
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
      "import/newline-after-import": "warn",

      // General
      "no-alert": "warn",
      "no-console": "off",
      "prettier/prettier": "warn",
    },
  },
  {
    files: ["test/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  ...(jsoncParser
    ? [
        {
          files: ["**/*.json", "**/*.jsonc"],
          languageOptions: { parser: jsoncParser },
          plugins: { ...(jsoncPlugin ? { jsonc: jsoncPlugin } : {}) },
          rules: {
            ...(jsoncPlugin ? { "jsonc/no-comments": "error" } : {}),
            ...(jsoncPlugin && jsoncPlugin.configs && jsoncPlugin.configs.recommended
              ? jsoncPlugin.configs.recommended.rules
              : {}),
          },
        },
      ]
    : []),

  ...(yamlParser
    ? [
        {
          files: ["**/*.{yml,yaml}"],
          languageOptions: { parser: yamlParser },
          plugins: { ...(ymlPlugin ? { yml: ymlPlugin } : {}) },
          rules: {
            ...(ymlPlugin ? { "yml/no-empty-document": "error" } : {}),
            ...(ymlPlugin
              ? { "yml/quotes": ["error", { avoidEscape: true, prefer: "single" }] }
              : {}),
            ...(ymlPlugin ? { "yml/indent": ["error", 2] } : {}),
            ...(ymlPlugin && ymlPlugin.configs && ymlPlugin.configs.recommended
              ? ymlPlugin.configs.recommended.rules
              : {}),
          },
        },
      ]
    : []),

  ...(mdxPlugin
    ? [
        {
          files: ["**/*.mdx"],
          plugins: { mdx: mdxPlugin },
          languageOptions: {
            parser:
              mdxPlugin.parsers && mdxPlugin.parsers["mdx"] ? mdxPlugin.parsers["mdx"] : undefined,
          },
          rules: {
            ...(mdxPlugin && mdxPlugin.configs && mdxPlugin.configs.recommended
              ? mdxPlugin.configs.recommended.rules
              : {}),
          },
        },
      ]
    : []),

  ...(mdPlugin && mdProcessorEntry
    ? [
        {
          files: ["**/*.md"],
          plugins: { markdown: mdPlugin },
          processor: `markdown/${mdProcessorEntry}`,
          rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
          },
        },
      ]
    : []),

  ...(htmlPlugin
    ? [
        {
          files: ["**/*.html"],
          plugins: { html: htmlPlugin },
          processor: "html/html",
          rules: {
            "no-implied-eval": "error",
            "no-eval": "error",
            "no-console": "warn",
          },
        },
      ]
    : []),
];
