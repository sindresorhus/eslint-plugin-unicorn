# prefer-simplified-conditions

📝 Prefer simplified conditions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer simpler logical conditions when they are equivalent and easier to read.

This rule applies De Morgan's laws when they reduce negation noise, factors direct leading common terms in boolean conditions, and removes simple absorbed conditions. It intentionally does not try to be a full boolean algebra optimizer.

By default, it does not expand plain negated groups like `!(a && b)`, because those are not consistently easier to read. Use the [`negatedConditions`](#negatedconditions) option to prefer expanded conditions.

Factoring is intentionally limited to leading common terms to avoid changing evaluation order. The rule does not reorder operands to find a common term.

Absorbed conditions that would otherwise skip reading another operand are only fixed when that operand can be inferred to be safe to drop, such as a parameter or literal. Unresolved globals and `let`/`const` bindings are not treated as safe to drop.

## Examples

```js
// ❌
if (!(key === 'y' && !isEditable(target))) {}

// ✅
if (key !== 'y' || isEditable(target)) {}
```

```js
// ❌
if (!(!a && !b)) {}

// ✅
if (a || b) {}
```

```js
// ❌
if ((a && b) || (a && c)) {}

// ✅
if (a && (b || c)) {}
```

```js
// ❌
if ((c || a) && (c || b)) {}

// ✅
if (c || (a && b)) {}
```

```js
// ❌
if (a || (a && b)) {}

// ✅
if (a) {}
```

Examples of code that should not be changed with the default options:

```js
// The operands can produce non-boolean values.
const value = (a && b) || (a && c);

// Plain De Morgan expansion is not always clearer.
if (!(min <= value && value <= max)) {}

// Dropping `object.property` would skip a property read.
if ((object.property && a) || a) {}
```

The rule avoids factoring expressions when the result would be used as a value instead of a boolean, unless every operand is known to produce a boolean, such as boolean comparisons or TypeScript boolean types.

## Options

Type: `object`

### negatedConditions

Type: `string`\
Default: `'simplify'`

- `'simplify'`: Expand negated `&&` and `||` groups only when doing so reduces negations.
- `'expand'`: Expand negated `&&` and `||` groups even when doing so increases negations.

This option only affects De Morgan transformations. Factoring and absorption are unchanged.

```js
{
	'unicorn/prefer-simplified-conditions': [
		'error',
		{
			negatedConditions: 'expand',
		},
	],
}
```

With `'expand'`:

```js
// ❌
if (!(loggedInUser && isWebPage())) {}

// ✅
if (!loggedInUser || !isWebPage()) {}
```

```js
// ❌
const result = !(a || (b && c));

// ✅
const result = !a && (!b || !c);
```

Fixes preserve boolean results and short-circuit evaluation order. When an operand cannot be inferred to produce a boolean, expanding a negated operand may require double negation:

```js
// ❌
const result = !(!a && b);

// ✅
const result = !!a || !b;
```

Equality comparisons use the opposite operator. Relational comparisons remain negated to preserve behavior with `NaN`, so `!(min <= value && value <= max)` becomes `!(min <= value) || !(value <= max)`.

Expressions containing comments are reported without an autofix. Double-negation wrappers such as `!!(a && b)` and negated nullish-coalescing expressions such as `!(a ?? b)` are left alone.
