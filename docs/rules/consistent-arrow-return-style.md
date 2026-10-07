# consistent-arrow-return-style

📝 Enforce a consistent return style for multiline arrow function bodies.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use concise bodies when the expression fits on one line and an explicit `return` when it spans multiple lines. A line break between `=>` and a single-line expression is ignored.

Only blocks with a single `return` and a single-line argument are converted. Blocks with other statements, bare returns, or multiline return expressions are ignored. Commented functions are reported without fixes.

Fixes are omitted when reindenting could change string, template literal, or JSX text, or when removing the block could change how the following token is parsed.

This rule is an alternative to [`arrow-body-style`](https://eslint.org/docs/latest/rules/arrow-body-style). Do not enable both rules together.

## Examples

```js
// ❌
const getValue = () => getValueFromServer(
	url,
	options,
);

// ✅
const getValue = () => {
	return getValueFromServer(
		url,
		options,
	);
};

// ❌
const getValue = () => {
	return value;
};

// ✅
const getValue = () => value;

// ❌
const getObject = () => ({
	value,
});

// ✅
const getObject = () => {
	return {
		value,
	};
};

// ❌ No fix: contains a comment.
const getValue = () => /* Keep this comment. */
	getValueFromServer(
		url,
		options,
	);
```
