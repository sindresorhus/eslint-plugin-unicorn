# no-for-loop-extra-variable

📝 Disallow cached array length variables in `for` loop initializers.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Caching `array.length` in a `for` loop initializer is an outdated pattern that makes the loop harder to simplify.

## Examples

This rule rewrites:

```js
// ❌
for (let i = 0, j = array.length; i < j; i += 1) {
	console.log(array[i], j);
}

// ✅
for (let i = 0; i < array.length; i += 1) {
	console.log(array[i], array.length);
}
```

This keeps the loop behavior the same while making it easier for [`unicorn/no-for-loop`](./no-for-loop.md) to handle the simplified loop afterward.
