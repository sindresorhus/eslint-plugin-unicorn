# prefer-get-or-insert-computed

📝 Prefer `.getOrInsertComputed()` when the default value has side effects.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Map#getOrInsert()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsert) and [`WeakMap#getOrInsert()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/getOrInsert) always evaluate the default value, even when the key already exists. Use [`Map#getOrInsertComputed()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsertComputed) or [`WeakMap#getOrInsertComputed()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap/getOrInsertComputed) when creating the default value has side effects.

## Examples

```js
// ❌
map.getOrInsert(key, call());

// ✅
map.getOrInsertComputed(key, () => call());
```

```js
// ❌
map.getOrInsert(key, call(key));

// ✅
map.getOrInsertComputed(key, call);
```
