# no-negated-comparison

📝 Disallow negated comparisons.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using the opposite comparison operator instead of negating the whole comparison.

Writing the opposite operator directly makes the comparison easier to read and reduces mental negation.

Only equality comparisons (`===`, `!==`, `==`, `!=`) are checked, since those are the ones the opposite operator reproduces exactly.

Relational comparisons (`<`, `>`, `<=`, `>=`) are left alone. Every relational comparison with `NaN` is false, so `!(value >= 1)` is `true` for `NaN`, `undefined`, `'abc'`, and `{}`, while `value < 1` is `false` for all of them. That makes the negated form a common way to reject anything that is not a comparable number:

```js
if (!(options.factor > 0)) {
	options.factor = 1;
}
```

By default, the rule intentionally does not rewrite compound logical expressions like `!(a === b && c === d)`. Keeping the grouped negation can be easier to read.

## Examples

```js
// ❌
const isDifferent = !(a === b);

// ✅
const isDifferent = a !== b;
```

```js
// ❌
if (!(typeof value === 'undefined')) {}

// ✅
if (typeof value !== 'undefined') {}
```

```js
// ✅
if (!(a === b && c === d)) {}
```

```js
// ✅
if (!(a > b)) {}
```

## Options

Type: `object`

### checkLogicalExpressions

Type: `boolean`\
Default: `false`

Check logical expressions that only contain equality comparisons.

This option intentionally does not attempt broad boolean algebra simplification. It ignores logical expressions with any part that is not an equality comparison, including relational ones like `!(a > b && c === d)`, and reports without a fix when comments are inside the negated expression.

```js
{
	'unicorn/no-negated-comparison': [
		'error',
		{
			checkLogicalExpressions: true,
		},
	],
}
```

```js
// ❌
if (!(a === b && c === d)) {}

// ✅
if (a !== b || c !== d) {}
```

```js
// ❌
if (!(a === b && (c === d || e === f))) {}

// ✅
if (a !== b || (c !== d && e !== f)) {}
```
