# no-invalid-argument-count

📝 Disallow calling functions with an invalid number of arguments.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript allows functions to be called with too few or too many arguments. This can hide refactoring mistakes when a local function signature changes but some call sites are not updated.

This rule checks simple local functions where the expected argument count is clear.

## Examples

```js
// ❌
function sum(first, second) {
	return first + second;
}

sum(1);
```

```js
// ❌
const sum = (first, second) => first + second;

sum(1, 2, 3);
```

```js
// ✅
function sum(first, second) {
	return first + second;
}

sum(1, 2);
```

```js
// ✅
function sum(first, second = 0) {
	return first + second;
}

sum(1);
```

```js
// ✅
function sum(first, ...rest) {
	return rest.reduce((total, value) => total + value, first);
}

sum(1, 2, 3);
```

## Limitations

This rule intentionally only checks local function declarations, `const` function expressions, `const` arrow functions, and direct IIFEs. Imported functions, member calls, constructors, dynamic/reassigned function variables, overloaded TypeScript declarations, and calls with spread arguments are ignored.
