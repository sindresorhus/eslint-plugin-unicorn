# no-useless-continue

📝 Disallow useless `continue` statements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A `continue` statement at the end of a loop iteration is unnecessary, since the loop advances to the next iteration anyway.

This mirrors the [`no-useless-return`](https://eslint.org/docs/latest/rules/no-useless-return) core rule.

Labeled `continue` statements are ignored, since they may target an outer loop.

## Examples

```js
// ❌
for (const item of items) {
	process(item);
	continue;
}

// ✅
for (const item of items) {
	process(item);
}
```

```js
// ❌
for (const item of items) {
	if (shouldSkip(item)) {
		continue;
	}
}

// ✅
for (const item of items) {
	if (!shouldSkip(item)) {
		// …
	}
}
```

```js
// ✅
for (const item of items) {
	if (shouldSkip(item)) {
		continue;
	}

	process(item);
}
```
