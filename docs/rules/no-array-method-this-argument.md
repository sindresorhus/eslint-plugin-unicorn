# Disallow using the `this` argument in array methods

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

The rule forbids using the `thisArg` argument in array methods:

- If the callback is an arrow function or a bound function, the `thisArg` won't affect it.
- If you intent to use a custom `this` in the callback, it‘s better to use the variable directly or use `callback.bind(thisArg)`.

This rule checks following array methods accepts `thisArg`:

- [`Array#every()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/every)
- [`Array#filter()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/filter)
- [`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/find)
- [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Array/findIndex)
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
