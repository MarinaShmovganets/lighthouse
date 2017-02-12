module.exports = {
  // start with google standard style
  //     https://github.com/google/eslint-config-google/blob/master/index.js
  "extends": ["eslint:recommended", "google"],
  "env": {
    "node": true,
    "es6": true
  },
  "rules": {
    // 2 == error, 1 == warning, 0 == off
    "array-callback-return": 2,
    "arrow-parens": [2, "as-needed"],
    "block-scoped-var": 2,
    "block-spacing": 2,
    "dot-notation": 2,
    "eqeqeq": 2,
    "indent": [2, 2, {
      "SwitchCase": 1,
      "VariableDeclarator": 2
    }],
    "keyword-spacing": [2, {
      "before": true,
      "after": true
    }],
    "max-len": [2, 100, {
      "ignoreComments": true,
      "ignoreUrls": true,
      "tabWidth": 2
    }],
    "no-alert": 2,
    "no-catch-shadow": 2,
    "no-cond-assign": 2,
    "no-confusing-arrow": [2, {
      "allowParens": true
    }],
    "no-div-regex": 2,
    "no-duplicate-imports": 2,
    "no-empty": [2, {
      "allowEmptyCatch": true
    }],
    "no-eq-null": 2,
    "no-eval": 2,
    "no-extra-label": 2,
    "no-floating-decimal": 2,
    "no-implicit-coercion": [2, {
      "boolean": false,
      "number": true,
      "string": true
    }],
    "no-implicit-globals": 2,
    "no-implied-eval": 2,
    "no-label-var": 2,
    "no-lone-blocks": 2,
    "no-lonely-if": 2,
    "no-loop-func": 2,
    "no-native-reassign": 2,
    "no-negated-condition": 2,
    "no-path-concat": 2,
    "no-self-compare": 2,
    "no-sequences": 2,
    "no-shadow-restricted-names": 2,
    "no-spaced-func": 2,
    "no-undef-init": 2,
    "no-unmodified-loop-condition": 2,
    "no-unneeded-ternary": 2,
    "no-unused-expressions": [2, {
      "allowShortCircuit": true,
      "allowTernary": false
    }],
    "no-unused-vars": [2, {
      "vars": "all",
      "args": "after-used",
      "argsIgnorePattern": "(^reject$|^_$)",
      "varsIgnorePattern": "(^_$)"
    }],
    "no-useless-call": 2,
    "no-useless-computed-key": 2,
    "no-useless-concat": 2,
    "no-useless-constructor": 2,
    "no-useless-escape": 2,
    "no-useless-rename": 2,
    "no-void": 2,
    "no-whitespace-before-property": 2,
    "operator-assignment": [2, "always"],
    "operator-linebreak": [2, "after"],
    "prefer-const": 2,
    "quotes": [2, "single"],
    "space-infix-ops": 2,
    "space-in-parens": [2, "never"],
    "space-unary-ops": 2,
    "strict": [2, "global"],
    "unicode-bom": [2, "never"],
    "yoda": [2, "never"],

    // Disabled rules
    "callback-return": 0,
    "comma-dangle": 0,
    "consistent-return": 0,
    "default-case": 0,
    "new-parens": 0,
    "no-else-return": 0,
    "no-empty-function": 0,
    "no-extra-parens": 0,
    "no-mixed-operators": 0,
    "no-return-assign": 0,
    "no-shadow": 0,
    "no-undefined": 0,
    "no-use-before-define": 0,
    "require-jsdoc": 0,
    "valid-jsdoc": 0,
  },
  "parserOptions": {
    "ecmaVersion": 6,
    "ecmaFeatures": {
      "globalReturn": true,
      "jsx": false,
      "experimentalObjectRestSpread": false
    },
    "sourceType": "script"
  }
}
