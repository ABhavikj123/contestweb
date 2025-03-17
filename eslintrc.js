/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: "next/core-web-vitals",
    rules: {
      // Disable rule for explicit "any" types
      "@typescript-eslint/no-explicit-any": "off"
    }
  };