# prefer-object-destructuring-defaults

📝 Prefer object destructuring defaults over default object literals with spread.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer object destructuring defaults over creating a temporary object literal with default properties and a final object spread.

Object destructuring defaults are shorter and make each default visible next to the binding that uses it. The suggested replacement uses `?? {}` so destructuring still works when the spread source is `null` or `undefined`.

This rule intentionally reports only simple variable declarations. It does not report `Object.assign()`, destructuring assignment expressions, computed properties, rest properties, or patterns with comments.

## Examples

```js
// ❌
const {foo, bar} = {
	foo: false,
	bar: 1,
	...options,
};

// ✅
const {foo = false, bar = 1} = options ?? {};
```

```js
// ❌
const {foo: localFoo} = {
	foo: false,
	...options,
};

// ✅
const {foo: localFoo = false} = options ?? {};
```

```js
// ✅
const {foo, bar} = options;
```
