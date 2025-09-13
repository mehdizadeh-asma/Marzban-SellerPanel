module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 100,
  arrowParens: "always",
  endOfLine: "lf",
  quoteProps: "as-needed",
  plugins: [require.resolve("prettier-plugin-organize-imports")],
};
