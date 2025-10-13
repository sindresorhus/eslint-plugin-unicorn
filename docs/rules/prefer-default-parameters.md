# Prefer default parameters over reassignment

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Instead of reassigning a function parameter, default parameters should be used. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule only reports reassignments to literal values.

You should disable this rule if you want your functions to deal with `null` and other falsy values the same way as `undefined`. Default parameters are exclusively applied [when `undefined` is received.](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters#passing_undefined_vs._other_falsy_values). However, we recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

## Examples

```js
// ❌
function abc(foo) {
	foo = foo || 'bar';
}

// ✅
function abc(foo = 'bar') {}
```

```js
// ❌
function abc(foo) {
	const bar = foo || 'bar';
}

// ✅
function abc(bar = 'bar') {}
```

```js
// ✅
function abc(foo) {
	foo = foo || bar();
}
```
