# require-property-descriptors

📝 Require descriptors in CSS `@property` rules.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Require mandatory descriptors in CSS [`@property`](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule) registrations. Browsers ignore registrations missing these descriptors.

- `syntax` and `inherits` are always required.
- `initial-value` is required unless the syntax string is `"*"`, optionally surrounded by ASCII whitespace.

The rule checks `initial-value` only when `syntax` is a single string.

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

This rule checks presence only; empty values count. Values, computational independence, `!important`, property names, and placement are not validated.

Use [`css/no-invalid-at-rules`](https://github.com/eslint/css/blob/main/docs/rules/no-invalid-at-rules.md) to check at-rule names, preludes, and descriptor value grammar.

At-rule and descriptor names are case-insensitive; CSS escapes are decoded. Only direct declarations count. The last duplicate wins; browser recovery from invalid values is not modeled.

No fixes or suggestions are provided because descriptor values require author intent.
