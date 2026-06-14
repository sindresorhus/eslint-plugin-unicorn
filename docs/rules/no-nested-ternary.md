# no-nested-ternary

📝 Disallow nested ternary expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Improved version of the [`no-nested-ternary`](https://eslint.org/docs/latest/rules/no-nested-ternary) ESLint rule. This rule allows cases where the nested ternary is only one level and wrapped in parens.

## Replacement for ESLint `no-nested-ternary`

This rule replaces ESLint's built-in `no-nested-ternary` rule, which Unicorn presets disable when this rule is enabled.

## Examples

```js
// ❌
const foo = i > 5 ? i < 100 ? true : false : true;

// ✅
const foo = i > 5 ? (i < 100 ? true : false) : true;
```

```js
// ❌
const foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));
```

```js
// ✅
const foo = i > 5 || i < 100 || i < 1000;
```

## Partly fixable

This rule is only fixable when the nesting is up to one level. The rule will wrap the nested ternary in parens:

```js
const foo = i > 5 ? i < 100 ? true : false : true
```

will get fixed to

```js
const foo = i > 5 ? (i < 100 ? true : false) : true
```

## Disabling ESLint `no-nested-ternary`

We recommend disabling the ESLint `no-nested-ternary` rule in favor of this one:

```js
{
	rules: {
		'no-nested-ternary': 'off',
	},
}
```

The Unicorn presets do this for you when this rule is enabled.
