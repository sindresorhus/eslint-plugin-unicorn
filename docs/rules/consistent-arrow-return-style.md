# consistent-arrow-return-style

📝 Enforce a consistent return style for multiline arrow function bodies.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use concise bodies when the expression fits on one line and an explicit `return` when it spans multiple lines. A line break between `=>` and a single-line expression is ignored.

Only blocks with a single `return` and a single-line argument are converted. Blocks with other statements, bare returns, multiline return expressions, or comments are ignored.

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

// ✅ Ignored because it contains a comment.
const getValue = () => /* A comment means this function is ignored. */
	getValueFromServer(
		url,
		options,
	);
```
