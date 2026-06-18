# no-loop-iterable-mutation

📝 Disallow mutating a loop iterable during iteration.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Mutating an iterable while a `for...of` loop consumes it can skip, repeat, or unexpectedly visit items.

This rule reports mutating `Array`, `Set`, and `Map` methods on the active iterable, including `.keys()`, `.values()`, and `.entries()` loops.

Same-current-entry `Set` and `Map` updates are allowed. Delete-then-reinsert patterns are not.

It intentionally ignores iterator aliases, non-method writes like `array.length = 0`, and snapshot loops from `Object.keys()`, `Object.values()`, and `Object.entries()`.

## Examples

```js
// ❌
for (const item of items) {
	items.push(item.clone());
}

// ✅
for (const item of [...items]) {
	items.push(item.clone());
}

// ❌
for (const value of values) {
	values.shift();
}

// ✅
for (const key of Object.keys(object)) {
	delete object[key];
}

// ❌
for (const value of set) {
	set.delete(value);
	set.add(value);
}

// ✅
for (const value of set) {
	set.add(value);
}

// ✅
for (const key of map.keys()) {
	map.set(key, newValue);
}

// ✅
for (const [key] of map) {
	map.delete(key);
}
```
