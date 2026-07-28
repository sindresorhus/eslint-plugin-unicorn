# no-useless-fallback-in-loop

📝 Disallow empty fallbacks in `for…of`, `for await…of`, and `for…in` loops.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using an empty fallback only to make a loop do nothing when a value is nullish or otherwise falsy creates an unnecessary collection. Guard the loop instead.

The rule checks empty array fallbacks using `??` or `||` in `for…of` and `for await…of` loops, empty object fallbacks using `??` or `||` in `Object.keys()`, `Object.values()`, and `Object.entries()` calls used by those loops, and empty object fallbacks using `??` or `||` in `for…in` loops.

## Examples

```js
// ❌
for (const item of items ?? []) {
	use(item);
}

// ❌
for (const [key, value] of Object.entries(options.config ?? {})) {
	use(key, value);
}

// ❌
for (const key in options.config || {}) {
	use(key);
}
```

```js
// ✅
if (items != null) {
	for (const item of items) {
		use(item);
	}
}

// ✅
if (options.config != null) {
	for (const [key, value] of Object.entries(options.config)) {
		use(key, value);
	}
}

// ✅
for (const key in options.config) {
	use(key);
}
```

The rule does not check fallbacks outside these loop forms. Fallbacks in `for…of` loops are only rewritten when the source has no obvious side effects, the loop can be safely wrapped, and the loop does not contain a token spanning multiple lines. Fallbacks in `for await…of` and `for…in` loops are reported but not fixed. Autofixes intentionally do not account for getter or Proxy behavior or the legacy `document.all` value. The `for…in` check assumes `Object.prototype` has no enumerable properties.
