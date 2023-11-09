module.exports = {
  extends: ["airbnb-typescript", "next"],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    "@typescript-eslint/quotes": ["error", "double"],
    "no-underscore-dangle": "off",
    "react/require-default-props": "off",
    "import/prefer-default-export": "off",
    "@typescript-eslint/comma-dangle": ["error", "never"],
    "no-alert": "off",
    "object-curly-newline": ["error", {
      "ObjectExpression": {"consistent": true},
      "ObjectPattern": {"consistent": true},
      "ImportDeclaration": {
        "multiline": true,
        "minProperties": 5
      },
      "ExportDeclaration": {
        "multiline": true,
        "minProperties": 5
      }
    }],
    "max-len": ["error", 250],
    "import/no-extraneous-dependencies": "off",
    "class-methods-use-this": "off",
    "no-case-declarations": "off",
    "no-console": "off",
    "typescript-eslint/no-unused-expressions": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "no-restricted-syntax": "off",
    "no-plusplus": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "react/no-array-index-key": "off",
    "no-await-in-loop": "off",
    "guard-for-in": "off",
    "@typescript-eslint/naming-convention": "off",
    "new-cap": "off",
    "padded-blocks": ["error", {
      "classes": "always"
    }],
    "react/prop-types": "off",
    "jsx-a11y/control-has-associated-label": "off",
    "react/button-has-type": "off",
    "max-classes-per-file": "off",
    "import/extensions": ['error', 'never', {ignorePackages: true} ],
    "jsx-a11y/anchor-is-valid": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "@next/next/no-img-element": "off",
    "lines-around-directive": "off",
    "padding-line-between-statements": "off",
    "no-spaced-func": "off",
    "func-call-spacing": "off",
    "global-require": "off",
    "no-buffer-constructor": "off",
    "no-new-require": "off",
    "no-path-concat": "off"
  }
};