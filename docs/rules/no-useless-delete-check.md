# no-useless-delete-check

📝 Disallow unnecessary existence checks before deletion.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Deletion is already safe when the property, key, or value does not exist, so an existence guard is usually unnecessary.

This rule reports simple `in` checks before deleting from known objects. It also reports `.has()` checks before deleting from local `const` variables initialized with `new Map`, `new Set`, `new WeakMap`, or `new WeakSet`. When `.delete()` is the first of several statements in the branch, the edit uses its boolean result as the condition. Both calls must use the collection variable directly for this edit.

The rule ignores compound conditions, unknown receivers, `Object.hasOwn()`, `hasOwnProperty()`, custom collections, and type-only collection annotations. When deletion is the only statement in the branch, it also ignores guards with an `else` branch and `else if` clauses.

Collection fixes assume the standard `.has()` and `.delete()` methods. The rule fixes cases where the key is safe to evaluate once and the edit preserves comments. For keys read with plain dot notation, such as `warning.message`, it offers a suggestion because a getter can make repeated reads observable. It skips computed and optional property reads as collection keys. Object deletion is provided as a suggestion because `Proxy` traps can make unconditional `delete` observable.

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
