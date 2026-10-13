# no-useless-length-check

📝 Disallow useless array length check.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

- `Array#some()` returns `false` for an empty array. There is no need to check if the array is not empty.
- `Array#every()` returns `true` for an empty array. There is no need to check if the array is empty.
- `for…of` does not iterate over an empty array. There is no need to check if the array is not empty.

We only check `.length === 0`, `.length !== 0`, and `.length > 0`. These zero and non-zero length check styles are allowed in the [`unicorn/explicit-length-check`](./explicit-length-check.md#options) rule. It is recommended to use them together.

Some removals offer suggestions instead of autofixes. Removing a check before `some()` or `every()` evaluates the call arguments even for an empty array, so it is only autofixed when the arguments have no side effects. Removing a check after the call can change the result if the callback changes the array's length, so it is only autofixed when the callback is an inline arrow function without side effects.

## Examples

```js
// ❌
if (array.length === 0 || array.every(Boolean));

// ✅
if (array.every(Boolean));
```

```js
// ❌
if (array.length !== 0 && array.some(Boolean));

// ✅
if (array.some(Boolean));
```

```js
// ❌
if (array.length > 0 && array.some(Boolean));

// ✅
if (array.some(Boolean));
```

```js
// ❌
if (array.length > 0) {
	for (const element of array) {
		use(element);
	}
}

// ✅
for (const element of array) {
	use(element);
}
```

```js
// ❌
const isAllTruthyOrEmpty = array.length === 0 || array.every(Boolean);

// ✅
const isAllTruthyOrEmpty = array.every(Boolean);
```

```js
// ✅
if (array.length === 0 || anotherCheck() || array.every(Boolean));
```

```js
// ✅
const isNonEmptyAllTruthyArray = array.length > 0 && array.every(Boolean);
```

```js
// ✅
const isEmptyArrayOrAllTruthy = array.length === 0 || array.some(Boolean);
```
