# no-loop-iterable-mutation

📝 Disallow mutating a loop iterable during iteration.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Mutating the same live iterable that a `for...of` loop is consuming can make iteration silently visit newly-added items, skip existing items, or stop earlier than expected.

This rule reports mutating method calls on the same iterable reference, including arrays, `Set`, and `Map`, while iterating over the iterable itself or over its `.keys()`, `.values()`, or `.entries()` iterator.

It allows simple same-current-entry `Set#add`, `Set#delete`, `Map#set`, and `Map#delete` calls when the current value or key comes from a `const` loop binding and the syntax identifies that current entry, but still reports direct delete-then-reinsert sequences like `set.delete(value); set.add(value);`.

It intentionally does not report every possible write to the iterable, such as assigning `array.length` or deleting an array index.

It intentionally does not track aliases to iterators, such as `const iterator = items.values();`.

It reports same-value `delete` calls in `.values()` loops because `Map#values()` does not yield keys and this rule does not use type information.

This is a syntax-only rule. It treats direct identifier iteration, such as `for (const value of set)`, as value iteration, and direct destructuring, such as `for (const [key] of map)`, as entry iteration. This matches common `Set` and `Map` loops, but does not distinguish ambiguous custom iterables, `Map` entries kept as a single variable, or `Set` values that are themselves iterable.

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
