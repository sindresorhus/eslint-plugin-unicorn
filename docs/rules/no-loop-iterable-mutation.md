# no-loop-iterable-mutation

📝 Disallow mutating a loop iterable during iteration.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Mutating the same live iterable that a `for...of` loop is consuming can silently skip items, repeat items, or visit newly added items.

This rule reports mutating `Array`, `Set`, and `Map` method calls on the iterable being consumed directly or through `.keys()`, `.values()`, or `.entries()`.

It allows simple same-current-entry `Set#add`, `Set#delete`, `Map#set`, and `Map#delete` calls when the current entry is clear from syntax or static collection information. It still reports delete-then-reinsert sequences like `set.delete(value); set.add(value);`.

When the iterable type is unknown, direct identifier and destructuring loops are interpreted syntactically. Ambiguous `Map` and `Set` shapes need static information to be classified precisely.

It intentionally ignores iterator aliases, property writes like `array.length = 0`, index deletes, complex delete-then-reinsert ordering, and `Object.keys()`/`Object.values()`/`Object.entries()` snapshot loops.

## Examples

```js
// ❌
for (const item of items) {
	items.push(item.clone());
}
```

```js
// ❌
for (const value of values) {
	values.shift();
}
```

```js
// ❌
for (const value of set) {
	set.delete(value);
	set.add(value);
}
```

```js
// ✅
for (const item of [...items]) {
	items.push(item.clone());
}
```

```js
// ✅
for (const key of Object.keys(object)) {
	delete object[key];
}
```

```js
// ✅
for (const value of set) {
	set.add(value);
}
```

```js
// ✅
for (const key of map.keys()) {
	map.set(key, newValue);
}
```

```js
// ✅
for (const [key] of map) {
	map.delete(key);
}
```
