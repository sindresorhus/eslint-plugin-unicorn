# prefer-set-has

📝 Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Set#has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has) is faster than [`Array#includes()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes).

## Examples

```js
// ❌
const array = [1, 2, 3];
const hasValue = value => array.includes(value);

// ✅
const set = new Set([1, 2, 3]);
const hasValue = value => set.has(value);
```

Arrays with supported extra references can also be converted when they have more than one `includes()` lookup. The array must be a plain literal with only unique, statically known primitive or `null` values, and no holes, spreads, or `-0`.

Supported extra references are `for…of`, array spread, call or constructor argument spread, `.length`, and `.forEach()` with a one-parameter arrow function.

```js
// ❌
const array = [1, 2, 3];
for (const item of array) {
	console.log(item);
}

const length = array.length;
const hasValue = value => array.includes(value);

// ✅
const set = new Set([1, 2, 3]);
for (const item of set) {
	console.log(item);
}

const length = set.size;
const hasValue = value => set.has(value);
```

```js
// ✅
// This array has a usage that does not work the same on a `Set`.
const array = [1, 2];
const hasValue = value => array.includes(value);
array.push(3);
```

```js
// ✅
// This array is only checked once.
const array = [1, 2, 3];
const hasOne = array.includes(1);
```

## Options

Type: `object`

### `minimumItems`

Type: `integer`\
Minimum: `0`\
Default: `0`

The minimum known array size before `Set#has()` is enforced.

When this option is greater than `0`, this rule only reports arrays with a statically known size.

```js
/* eslint unicorn/prefer-set-has: ["error", {"minimumItems": 5}] */

// ❌
const array = [1, 2, 3, 4, 5];
const hasValue = value => array.includes(value);

// ✅
const smallArray = [1, 2, 3, 4];
const hasSmallValue = value => smallArray.includes(value);
```
