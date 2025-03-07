# Disallow using the `this` argument in array methods

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The rule disallows using the `thisArg` argument in array methods:

- If the callback is an arrow function or a bound function, the `thisArg` won't affect it.
- If you intent to use a custom `this` in the callback, it's better to use the variable directly or use `callback.bind(thisArg)`.

This rule checks following array methods accepts `thisArg`:

- [`Array.from()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/from)
- [`Array#every()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/every)
- [`Array#filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/filter)
- [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/find)
- [`Array#findLast()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/findLast)
- [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/findIndex)
- [`Array#findLastIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/findLastIndex)
- [`Array#flatMap()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/flatMap)
- [`Array#forEach()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/forEach)
- [`Array#map()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/map)
- [`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/some)

This rule is fixable when the callback is an arrow function and the `thisArg` argument has no side effect.

## Fail

```js
const foo = bar.find(element => isUnicorn(element), baz);
```

```js
const foo = bar.map(function (element) => {
	return this.unicorn(element);
}, baz);
```

## Pass

```js
const foo = bar.find(element => isUnicorn(element));
```

```js
const foo = bar.map(function (element) => {
	return baz.unicorn(element);
});
```

```js
const foo = bar.map(function (element) => {
	return this.unicorn(element);
}.bind(baz));
```
