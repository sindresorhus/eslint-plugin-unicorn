# no-useless-delete-check

📝 Disallow unnecessary existence checks before deletion.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule flags `in` guards before deleting from known objects and `.has()` guards before deleting from local `const` collections initialized with `new Map`, `new Set`, `new WeakMap`, or `new WeakSet`.

When `.delete()` starts a branch with more statements, the edit uses its result as the condition. Both calls must use the collection variable directly. The rule skips delete-only `else if` clauses and delete-only branches with an `else`.

Collection fixes assume standard methods and preserve comments. Object deletion and keys read with plain dot notation get suggestions because proxy traps or getters can make the edit observable. The rule skips compound conditions, `Object.hasOwn()`, `hasOwnProperty()`, and computed or optional collection keys.

## Examples

```js
const object = {};

// ❌
if (key in object) {
	delete object[key];
}

// ✅
delete object[key];
```

```js
const map = new Map();

// ❌
if (map.has(key)) {
	map.delete(key);
}

// ✅
map.delete(key);
```

```js
const set = new Set();

// ❌
if (set.has(value)) {
	set.delete(value);
}

// ✅
set.delete(value);
```

```js
const set = new Set();

// ❌
if (set.has(value)) {
	set.delete(value);
	console.log(value);
}

// ✅
if (set.delete(value)) {
	console.log(value);
}
```

```js
// ✅
const map = new Map();

if (map.has(key)) {
	map.delete(key);
} else {
	handleMissingKey();
}
```
