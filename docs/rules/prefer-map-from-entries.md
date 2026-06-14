# prefer-map-from-entries

📝 Prefer `new Map()` over `Object.fromEntries()` when using the result as a map.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use a [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) when a value created from non-array-index string-keyed entry pairs is only used through map-like operations.

This rule only reports variables where all references can be converted together. Unsupported references and unknown entry key types are ignored instead of partially converting the variable.

## Examples

```js
// ❌
const object = Object.fromEntries(Object.entries(source));

if (Object.hasOwn(object, 'foo')) {
	console.log(object.foo);
}
```

```js
// ✅
const object = new Map(Object.entries(source));

if (object.has('foo')) {
	console.log(object.get('foo'));
}
```

```js
// ✅
const object = Object.fromEntries(entries);
foo(object);
```
