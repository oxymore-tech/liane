module.exports = {
  extends: ['airbnb-typescript'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    "@typescript-eslint/quotes": ["error", "double"],
    "no-trailing-spaces": "error",
    "no-underscore-dangle": "off",
    "react/require-default-props": "off",
    "import/prefer-default-export": "off",
    "import/extensions": "off",
    "@typescript-eslint/comma-dangle": ["error", "never"],
    "no-alert": "off",
    "object-curly-newline": ["error", {
      "ObjectExpression": {"consistent": true} ,
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
    "react/jsx-props-no-spreading": "off",
    "eol-last": "off",
    "max-classes-per-file": ["warn", 5],
    "react/jsx-filename-extension": [1,
      {
        "extensions": [
          ".tsx"
        ]
      }
    ]
  }
};