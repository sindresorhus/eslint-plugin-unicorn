# Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

## Fail

```js
const array = [1, 2, 3];
const hasValue = value => array.includes(value);
```

## Pass

```js
const set = new Set([1, 2, 3]);
const hasValue = value => set.has(value);
```

```js
// This array is not only checking existence.
const array = [1, 2];
const hasValue = value => array.includes(value);
array.push(3);
```

```js
// This array is only checked once.
const array = [1, 2, 3];
const hasOne = array.includes(1);
```
