# no-useless-delete-check

📝 Disallow unnecessary existence checks before deletion.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Deletion is already safe when the property, key, or value does not exist, so an existence guard is usually unnecessary.

This rule reports simple `in` checks before deleting from known objects, and `.has()` checks before deleting from local `const` `Map`, `Set`, `WeakMap`, and `WeakSet` instances.

The rule is conservative. It ignores `else` branches, compound conditions, unknown receivers, `Object.hasOwn()`, `hasOwnProperty()`, custom collections, type-only collection annotations, type-only TypeScript intersection types, and cases where removing the guard may be observable.

Collection cases are automatically fixed when doing so preserves comments. Object deletion is provided as a suggestion because `Proxy` traps can make unconditional `delete` observable.

## Examples

```js
// ❌
const object = {};

if (key in object) {
	delete object[key];
}

// ✅
delete object[key];
```

```js
// ❌
const map = new Map();

if (map.has(key)) {
	map.delete(key);
}

// ✅
map.delete(key);
```

```js
// ❌
const set = new Set();

if (set.has(value)) {
	set.delete(value);
}

// ✅
set.delete(value);
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
