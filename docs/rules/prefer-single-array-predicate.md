# prefer-single-array-predicate

📝 Prefer a single `Array#some()` or `Array#every()` with a combined predicate.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer a single [`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) or [`Array#every()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every) call with a combined predicate instead of repeating the same array check in a logical expression.

This rule only checks simple expression-bodied arrow functions that use the same array receiver, method, logical operator, and callback parameter name.

This rule provides suggestions instead of an autofix because combining predicates can change callback evaluation order when predicates have side effects.

## Examples

```js
// ❌
array.some(element => element.foo) || array.some(element => element.bar);

// ✅
array.some(element => element.foo || element.bar);
```

```js
// ❌
array.every(element => element.foo) && array.every(element => element.bar);

// ✅
array.every(element => element.foo && element.bar);
```
