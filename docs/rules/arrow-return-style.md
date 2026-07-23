# arrow-return-style

📝 Enforce a consistent return style for multiline arrow function bodies.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

For concise arrow function bodies, keeping a simple expression on one line is readable. When an expression spans multiple lines, an explicit `return` makes the function boundary easier to scan and leaves room for adding statements later.

This rule only considers the arrow function body. A line break between `=>` and a single-line expression does not trigger it.

This rule ignores arrow functions containing comments to avoid moving comments during autofixes.

Autofixes are omitted when reindenting could change the contents of a string, template literal, or JSX text.

This rule is an alternative to [`arrow-body-style`](https://eslint.org/docs/latest/rules/arrow-body-style). Do not enable both rules together.

## Examples

Examples of incorrect code:

```js
const getValue = () => getValueFromServer(
	url,
	options,
);

const getValue = () => {
	return value;
};

const getObject = () => ({
	value,
});
```

Examples of correct code:

```js
const getValue = () => value;

const getValue = () => {
	return getValueFromServer(
		url,
		options,
	);
};

const getObject = () => {
	return {
		value,
	};
};

const getValue = () => /* A comment means this function is ignored. */
	getValueFromServer(
		url,
		options,
	);
```
