# no-loop-iterable-mutation

📝 Disallow mutating a loop iterable during iteration.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Mutating the same live iterable that a `for...of` loop is consuming can make iteration silently visit newly-added items, skip existing items, or stop earlier than expected.

This rule reports mutating method calls on the same iterable reference, including arrays, `Set`, and `Map`, while iterating over the iterable itself or over its `.keys()`, `.values()`, or `.entries()` iterator.

It intentionally does not report every possible write to the iterable, such as assigning `array.length` or deleting an array index.

It intentionally does not report mutations of objects used with `Object.keys()`, `Object.values()`, or `Object.entries()`, since those methods create snapshot arrays before the loop starts.

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
	set.add(value + 1);
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
for (const value of set) {
	set.delete(value);
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
