# prefer-spread

📝 Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#{slice,toSpliced}()`, and trivial `for…of` copies.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of [the spread operator (`...`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) over outdated patterns. This also helps keep consistency by using a single flexible operator instead of:

- `Array.from(…)`

	Convert `Iterable` to `Array`.

	This rule adds on to the built-in [prefer-spread](https://eslint.org/docs/rules/prefer-spread) rule, which only flags uses of `.apply()`. Does not enforce for `TypedArray.from()`.
	Multi-spread array literals like `Array.from([...foo, ...bar])` are handled by [`prefer-iterator-concat`](./prefer-iterator-concat.md).

- `Array#concat(…)`

	Concat an `Array` with one or more `Array`s or `Array` elements.

	Receivers that can be proven not to be arrays are ignored using simple syntax checks, `Array.isArray()` control flow, TypeScript annotations, and TypeScript type information when available.

- `Array#slice()`

	Shallow copy an `Array`.

	Variables named `arrayBuffer`, `blob`, `buffer`, `file`, and `this` are ignored.

- `Array#toSpliced()`

	Shallow copy an `Array`.

- Trivial `for…of` copies into an empty array.

This rule intentionally does not check `String#split('')`. Spreading a string and splitting on an empty string segment text differently, and neither is generally correct for user-perceived characters. Use [`Intl.Segmenter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) when grapheme-aware segmentation is needed.

To enforce the spread operator over `Object#assign()`, use the built-in [`prefer-object-spread` rule](https://eslint.org/docs/rules/prefer-object-spread).

## Examples

```js
// ❌
Array.from(set).map(element => foo(element));

// ✅
[...set].map(element => foo(element));
```

```js
// ❌
const array = array1.concat(array2);

// ✅
const array = [...array1, ...array2];
```

```js
// ❌
const copy = array.slice();

// ❌
const copy = array.slice(0);

// ❌
const copy = array.toSpliced();

// ✅
const copy = [...array];
```

```js
// ❌
const result = [];
for (const element of array) {
	result.push(element);
}

// ✅
const result = [...array];
```

```js
// ✅
const tail = array.slice(1);
```

## With the `unicorn/no-useless-spread` rule

Some cases are fixed using extra spread syntax. Therefore we recommend enabling the [`unicorn/no-useless-spread`](./no-useless-spread.md) rule to fix it.

For example:

```js
const baz = [2];
call(foo, ...[bar].concat(baz));
```

Will be fixed to:

```js
const baz = [2];
call(foo, ...[bar, ...baz]);
```

`unicorn/no-useless-spread` will fix it to:

```js
const baz = [2];
call(foo, bar, ...baz);
```
