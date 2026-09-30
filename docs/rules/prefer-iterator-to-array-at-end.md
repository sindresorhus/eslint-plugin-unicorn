# prefer-iterator-to-array-at-end

📝 Prefer moving `.toArray()` to the end of iterator helper chains.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer moving `Iterator#toArray()` to the end of iterator helper chains.

Iterator helpers are lazy. Calling `toArray()` before helper methods like `map()` or `filter()` creates a temporary array and makes the rest of the chain use `Array` methods instead of lazy `Iterator` methods.

## Examples

```js
// ❌
const result = iterator.toArray().map(element => element * 2);

// ✅
const result = iterator.map(element => element * 2).toArray();
```

```js
// ❌
const result = iterator.toArray().filter(element => element > 1);

// ✅
const result = iterator.filter(element => element > 1).toArray();
```

A named callback is not reported. `Array` callbacks receive the element, the index and the array, while `Iterator` callbacks receive only the element, so a callback that reads the third argument would stop working. A callback declared with one or two parameters is safe and is reported:

```js
// ✅ Not reported, its parameter list is not visible here
const result = iterator.toArray().map(callback);
```

Cases are reported as suggestions instead of autofixes because moving `toArray()` changes when callbacks run: `Array` methods run after the iterator has been exhausted, while `Iterator` helpers run lazily as the result is consumed. `Array` callbacks also receive an extra `array` argument that `Iterator` callbacks do not.

`flatMap()` has an additional difference: `Array#flatMap()` accepts non-iterable callback results, while `Iterator#flatMap()` requires iterable results.

```js
// ❌
const result = iterator.toArray().flatMap(element => [element, element]);

// ✅
const result = iterator.flatMap(element => [element, element]).toArray();
```

`toArray()` is also a common user-defined method name, so a receiver that is known not to be an `Iterator` is left alone. That covers a `const` bound to an object, an array, a literal, or an instance of a class declared in the same file:

```js
// ✅
class Vector {
	toArray() {
		return [1, 2, 3];
	}
}

const vector = new Vector();
const result = vector.toArray().map(element => element * 2);
```

A bare call is not resolved, because `map.values()` is a call too, so a user-defined `toArray()` on a call result is still reported:

```js
// ❌
const result = makeVector().toArray().map(element => element * 2);
```

This rule only handles direct lazy helper equivalents. It intentionally does not convert `Array#slice()` to `Iterator#take()` or `Iterator#drop()`.
