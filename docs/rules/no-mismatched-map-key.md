# no-mismatched-map-key

📝 Disallow checking a Map key before accessing a different key.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you check a key with `Map#has()`, accesses to the same map in the guarded branch should use the same key. A different key is usually a copy-paste mistake.

This rule intentionally only reports simple, obvious cases.

## Examples

```js
// ❌
const value = map.has(key) ? map.get(anotherKey) : fallback;

// ✅
const value = map.has(key) ? map.get(key) : fallback;
```

```js
// ❌
if (!map.has(key)) {
	map.set(anotherKey, value);
}

// ✅
if (!map.has(key)) {
	map.set(key, value);
}
```
