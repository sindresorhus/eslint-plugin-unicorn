# Prefer `Number.isInteger()` for integer checking

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Enforces the use of [Number.isInteger()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger) for checking if a number is an integer.

There are multiple ways to check if a variable is an integer, but these approaches tend to have slightly different behaviours.

For example:

```js
// this is not an integer (or a number)
let notInteger = [['1']];

notInteger % 1 === 0; // true - ?! an array is defintely not an integer
Number.isInteger(notInteger); // false - makes sense

// this is an integer that is larger than Number.MAX_SAFE_INTEGER
let largeInteger = 1_000_000_000_000_000_000; 

largeInteger^0 === largeInteger; // false - its an integer, should be true
Number.isInteger(largeInteger); // true - makes sense
```

Due to the difference in behaviours across the different implementations, this rule is fixable via the suggestions API.

## Fail

```js
(value^0) === value
(value | 0) === value
Math.round(value) === value
parseInt(value, 10) === value
~~value === value

// these will all trigger the lint warning
_.isInteger(value);
lodash.isInteger(value);
underscore.isInteger(value);
```

## Pass

```js
Number.isInteger(value);
```
