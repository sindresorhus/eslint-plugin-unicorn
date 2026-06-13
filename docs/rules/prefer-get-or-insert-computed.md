# prefer-get-or-insert-computed

📝 Prefer `.getOrInsertComputed()` when the default value has side effects.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Map#getOrInsert()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsert) always evaluates the default value argument, even when the key already exists. This can cause performance issues or bugs when the default value has side effects (like function calls, database queries, or other operations). Use [`Map#getOrInsertComputed()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/getOrInsertComputed) instead to lazily evaluate the default value only when needed.

## Examples

```js
// ❌ - expensiveComputation() is called every time, even if key exists
const cache = new Map();
const result = cache.getOrInsert(key, expensiveComputation());

// ✅ - expensiveComputation() is only called if key doesn't exist
const cache = new Map();
const result = cache.getOrInsertComputed(key, () => expensiveComputation());
```

```js
// ❌ - Function is called even if the key exists
const userCache = new Map();
const user = userCache.getOrInsert(userId, fetchUserFromDatabase(userId));

// ✅ - Only fetches from database if user isn't cached
const userCache = new Map();
const user = userCache.getOrInsertComputed(userId, () => fetchUserFromDatabase(userId));
```

```js
// ❌ - generateId() is called every time, wasting IDs
const idMap = new Map();
const id = idMap.getOrInsert(key, generateId());

// ✅ - generateId() only called when needed
const idMap = new Map();
const id = idMap.getOrInsertComputed(key, generateId);
```
