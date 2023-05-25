module.exports = {
  root: true,
  extends: '@react-native-community',
  rules: {
    quotes: "off",
    "comma-dangle": "off",
    "react-hooks/exhaustive-deps": "warn",
    "react/react-in-jsx-scope": "off",
    "react-native/no-inline-styles": "off",
    "react-hooks/rules-of-hooks": "off"
  },
  plugins: ['prettier']
};