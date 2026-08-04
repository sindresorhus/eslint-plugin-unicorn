# iteration-fallback-style

📝 Enforce a consistent style for optional loop sources.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce a consistent style for optional loop sources. A guard skips the loop without creating an empty collection, while a fallback keeps the loop compact. The `guard` style is the default.

The rule checks direct `for…of` and `for await…of` loops that use empty array fallbacks or matching guards, loops over `Object.keys()`, `Object.values()`, or `Object.entries()` that use empty object fallbacks or matching guards, and `for…in` loops with empty object fallbacks or matching guards.

## Examples

```js
/* eslint unicorn/iteration-fallback-style: ['error', 'guard'] */

// ❌
for (const item of items || []) {
	use(item);
}

// ✅
if (items) {
	for (const item of items) {
		use(item);
	}
}
```

```js
/* eslint unicorn/iteration-fallback-style: ['error', 'guard'] */

// ❌
for (const [key, value] of Object.entries(options.config || {})) {
	use(key, value);
}

// ✅
if (options.config) {
	for (const [key, value] of Object.entries(options.config)) {
		use(key, value);
	}
}
```

```js
/* eslint unicorn/iteration-fallback-style: ['error', 'fallback'] */

// ❌
if (items) {
	for (const item of items) {
		use(item);
	}
}

// ✅
for (const item of items || []) {
	use(item);
}
```

```js
/* eslint unicorn/iteration-fallback-style: ['error', 'fallback'] */

// ❌
if (options.config) {
	for (const [key, value] of Object.entries(options.config)) {
		use(key, value);
	}
}

// ✅
for (const [key, value] of Object.entries(options.config || {})) {
	use(key, value);
}
```

## Options

Type: `string`\
Default: `'guard'`

### `guard`

Prefer an `if` guard over an empty fallback.

### `fallback`

Prefer an empty fallback over an `if` guard.

Truthiness guards correspond to `||` fallbacks, while `source != null` guards correspond to `??` fallbacks.

Only direct loop guards and fallbacks are checked. Autofixes are limited to simple synchronous `for…of` loops with reference sources; `for await…of` and `for…in` are reported but not fixed. Getters, Proxies, `document.all`, and enumerable `Object.prototype` properties are not accounted for.
