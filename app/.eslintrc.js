module.exports = {
  root: true,
  extends: "@react-native",
  rules: {
    quotes: "off",
    "comma-dangle": "off",
    "react-hooks/exhaustive-deps": "warn",
    "react/react-in-jsx-scope": "off",
    "react-native/no-inline-styles": "off",
    "react-hooks/rules-of-hooks": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-var": "error",
    "prefer-const": [
      "error",
      {
        destructuring: "any",
        ignoreReadBeforeAssign: false
      }
    ]
  },
  plugins: ["prettier"]
};
