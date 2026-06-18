# no-useless-delete-check

📝 Disallow unnecessary existence checks before deletion.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Deletion is already safe when the property, key, or value does not exist. Guarding the deletion with an existence check often adds unnecessary code.

This rule reports simple `in` checks before object property deletion for statically known object values, including object and array literals, function, arrow function, and class expressions assigned to `const` variables, and declared TypeScript `object`, function, or constructor annotations. TypeScript type assertions and `satisfies` expressions are treated as runtime-transparent and do not make an unknown receiver known. It also reports `.has()` checks before deletion from known local `const` variables initialized with global `Map`, `Set`, `WeakMap`, or `WeakSet`.

The rule is intentionally conservative. It does not report `else` branches, compound conditions, unknown object receivers, `Object.hasOwn()`, `hasOwnProperty()`, custom `.has()`/`.delete()` objects, type-only TypeScript intersection types, type-only collection annotations, or cases where the receiver, syntactically side-effectful key expressions, statically known object-valued keys, or keys initialized by calls with non-static return values may make removing the guard observable.

The rule assumes collection methods and prototypes on locally created `Map`, `Set`, `WeakMap`, and `WeakSet` instances retain their native behavior.

`Map`, `Set`, `WeakMap`, and `WeakSet` cases are automatically fixed when the guard can be removed without dropping comments. Object property deletion is provided as a suggestion under the same comment-preserving constraint because `Proxy` traps can make unconditional `delete` observable.

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
