# no-negated-comparison

📝 Disallow negated comparisons.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using the opposite comparison operator instead of negating the whole comparison.

Writing the opposite operator directly makes the comparison easier to read and reduces mental negation.

By default, the rule intentionally does not rewrite compound logical expressions like `!(a === b && c === d)`. Keeping the grouped negation can be easier to read.

Relational comparisons (`<`, `>`, `<=`, `>=`) with optional chaining are ignored, since the operand can be `undefined` and `!(a?.b >= 2)` is not equivalent to `a?.b < 2`. Equality comparisons are unaffected.

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

## Options

Type: `object`

### checkLogicalExpressions

Type: `boolean`\
Default: `false`

Check logical expressions that only contain comparisons.

This option intentionally does not attempt broad boolean algebra simplification. It ignores logical expressions with non-comparison parts and reports without a fix or suggestion when comments are inside the negated expression.

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
