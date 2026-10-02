# require-property-descriptors

📝 Require descriptors in CSS `@property` rules.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require the descriptors needed to register a custom CSS property with [`@property`](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule). Browsers ignore registrations that omit required descriptors.

- `syntax` and `inherits` are always required.
- `initial-value` is required unless the syntax string is `"*"`, optionally surrounded by ASCII whitespace.

When `syntax` is missing, the rule reports it without also requiring `initial-value`, since the intended syntax is unknown.

## Examples

```css
/* ❌ */
@property --brand {
	syntax: "<color>";
	inherits: false;
}

/* ✅ */
@property --brand {
	syntax: "<color>";
	inherits: false;
	initial-value: rebeccapurple;
}

/* ✅ */
@property --brand {
	syntax: "*";
	inherits: false;
}
```

The rule checks descriptor presence only, including descriptors with empty values. It does not validate values, computational independence, `!important`, property names, or at-rule placement. It skips the conditional `initial-value` check when `syntax` is not a single string value.

Use [`css/no-invalid-at-rules`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-at-rules.md) alongside this rule to check at-rule names, preludes, and descriptor value grammar.

Descriptor names and the at-rule name are case-insensitive, and CSS escapes are decoded. Only declarations directly inside the registration count. For duplicate descriptors, the last declaration is used; browser recovery from invalid duplicate values is not modeled.

There are no fixes or suggestions because the rule cannot infer the intended descriptor values.

## Usage

Enable the rule for CSS files using `@eslint/css`:

```js
import css from '@eslint/css';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.css'],
		plugins: {css, unicorn},
		language: 'css/css',
		rules: {
			'unicorn/require-property-descriptors': 'error',
		},
	},
];
```
