const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const prettierPlugin = require("eslint-plugin-prettier");
const reactPlugin = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");

let nextConfig = null;
let nextPlugin = null;
try {
  nextConfig = require("eslint-config-next");
} catch {}
try {
  nextPlugin = require("@next/eslint-plugin-next");
} catch {}

// optional parsers/plugins for extra filetypes
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
let mdProcessorEntry = null; // dynamic processor name if available
try {
  mdxPlugin = require("eslint-plugin-mdx");
} catch {}
try {
  mdPlugin = require("@eslint/markdown");
  if (mdPlugin && mdPlugin.processors) {
    const keys = Object.keys(mdPlugin.processors);
    if (keys.length > 0) mdProcessorEntry = keys[0]; // e.g. "markdown"
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
  // top-level registration so Next.js can detect plugin/extends if needed
  {
    plugins: {
      ...(nextPlugin ? { next: nextPlugin } : {}),
    },
    ...(nextConfig && nextConfig.configs && nextConfig.configs.recommended
      ? { rules: nextConfig.configs.recommended.rules }
      : {}),
  },

  // ignore
  {
    ignores: [
      ".next/",
      "node_modules/",
      "public/",
      "next-env.d.ts",
      "next.config.js",
      "prettier.config.js",
      "eslint.config.cjs",
    ],
  },

  // JS/TS (existing)
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

  // JSON files (requires jsonc-eslint-parser + eslint-plugin-jsonc)
  ...(jsoncParser
    ? [
        {
          files: ["**/*.json", "**/*.jsonc"],
          languageOptions: {
            parser: jsoncParser,
          },
          plugins: { ...(jsoncPlugin ? { jsonc: jsoncPlugin } : {}) },
          rules: {
            // ممنوع بودن کامنت در JSON
            ...(jsoncPlugin ? { "jsonc/no-comments": "error" } : {}),
            // استفاده از تنظیمات recommended پلاگین (در صورت وجود)
            ...(jsoncPlugin && jsoncPlugin.configs && jsoncPlugin.configs.recommended
              ? jsoncPlugin.configs.recommended.rules
              : {}),
          },
        },
      ]
    : []),

  // YAML files (requires yaml-eslint-parser + eslint-plugin-yml)
  ...(yamlParser
    ? [
        {
          files: ["**/*.{yml,yaml}"],
          languageOptions: { parser: yamlParser },
          plugins: { ...(ymlPlugin ? { yml: ymlPlugin } : {}) },
          rules: {
            // پیشنهادی:
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

  // MDX
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
            // می‌تونی قوانین عمومی جاوااسکریپت/ری‌اکت که داخل بلاک‌های MDX اعمال می‌شن را اینجا اضافه کنی
          },
        },
      ]
    : []),

  // Markdown (.md) using @eslint/markdown if available
  ...(mdPlugin && mdProcessorEntry
    ? [
        {
          files: ["**/*.md"],
          plugins: { markdown: mdPlugin },
          processor: `markdown/${mdProcessorEntry}`,
          rules: {
            // برای فایل‌های .md معمولاً قواعد مربوط به کدهای جاسازی‌شده اعمال می‌شود.
            // مثال: قواعد پایه‌ی JS که داخل بلاک‌‌های ```js اجرا شوند:
            "no-unused-vars": "warn",
            "no-undef": "error",
            // یا هر rule دیگری که می‌خواهی روی بلاک‌های کد MD اعمال شود.
          },
        },
      ]
    : []),

  // HTML (requires eslint-plugin-html) — only extracts inline scripts
  ...(htmlPlugin
    ? [
        {
          files: ["**/*.html"],
          plugins: { html: htmlPlugin },
          processor: "html/html",
          rules: {
            // پیشنهادی برای اسکریپت‌های inline:
            "no-implied-eval": "error",
            "no-eval": "error",
            "no-console": "warn",
          },
        },
      ]
    : []),
];
