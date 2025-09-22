# Enforce explicitly comparing the `length` or `size` property of a value

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is only meant to enforce a specific style and make comparisons more clear.

This rule is fixable, unless it's [unsafe to fix](#unsafe-to-fix-case).

## Zero comparisons

Enforce comparison with `=== 0` when checking for zero length.

### Examples

```js
// ❌
const isEmpty = !foo.length;

// ❌
const isEmpty = foo.length == 0;

// ❌
const isEmpty = foo.length < 1;

// ❌
const isEmpty = 0 === foo.length;

// ❌
const isEmpty = 0 == foo.length;

// ❌
const isEmpty = 1 > foo.length;

// ❌
// Negative style is disallowed too
const isEmpty = !(foo.length > 0);

// ✅
const isEmpty = foo.length === 0;
```

```js
// ❌
const isEmptySet = !foo.size;

// ✅
const isEmptySet = foo.size === 0;
```

```vue
<template>
	<!-- ❌ -->
	<div v-if="!foo.length">Vue</div>

	<!-- ✅ -->
	<div v-if="foo.length === 0">Vue</div>
</template>
```

## Non-zero comparisons

Enforce comparison with `> 0` when checking for non-zero length.

### Examples

```js
// ❌
const isNotEmpty = foo.length !== 0;

// ❌
const isNotEmpty = foo.length != 0;

// ❌
const isNotEmpty = foo.length >= 1;

// ❌
const isNotEmpty = 0 !== foo.length;

// ❌
const isNotEmpty = 0 != foo.length;

// ❌
const isNotEmpty = 0 < foo.length;

// ❌
const isNotEmpty = 1 <= foo.length;

// ❌
const isNotEmpty = Boolean(foo.length);

// ❌
// Negative style is disallowed too
const isNotEmpty = !(foo.length === 0);

// ✅
const isNotEmpty = foo.length > 0;
```

```js
// ❌
if (foo.length || bar.length) {}

// ✅
if (foo.length > 0 || bar.length > 0) {}
```

```js
// ❌
const unicorn = foo.length ? 1 : 2;

// ✅
const unicorn = foo.length > 0 ? 1 : 2;
```

```js
// ❌
while (foo.length) {}

// ✅
while (foo.length > 0) {}
```

```js
// ❌
do {} while (foo.length);

// ✅
do {} while (foo.length > 0);
```

```js
// ❌
for (; foo.length; ) {};

// ✅
for (; foo.length > 0; ) {};
```

### Options

You can define your preferred way of checking non-zero length by providing a `non-zero` option (`greater-than` by default):

```js
{
	'unicorn/explicit-length-check': [
		'error',
		{
			'non-zero': 'not-equal'
		}
	]
}
```

The `non-zero` option can be configured with one of the following:

- `greater-than` (default)
  - Enforces non-zero to be checked with: `foo.length > 0`
- `not-equal`
  - Enforces non-zero to be checked with: `foo.length !== 0`

## Unsafe to fix case

`.length` check inside `LogicalExpression`s are not safe to fix.

Example:

```js
const bothNotEmpty = (a, b) => a.length && b.length;

if (bothNotEmpty(foo, bar)) {}
```

In this case, the `bothNotEmpty` function returns a `number`, but it will most likely be used as a `boolean`. The rule will still report this as an error, but without an auto-fix. You can apply a [suggestion](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions) in your editor, which will fix it to:

```js
const bothNotEmpty = (a, b) => a.length > 0 && b.length > 0;

if (bothNotEmpty(foo, bar)) {}
```

The rule is smart enough to know some `LogicalExpression`s are safe to fix, like when it's inside `if`, `while`, etc.
