# Prefer `.flatMap(…)` over `.map(…).flat()`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

[`Array#flatMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) performs [`Array#map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) and [`Array#flat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat) in one step.


## Fail

```js
const foo = bar.map(element => unicorn(element)).flat();
```

```js
const foo = bar.map(element => unicorn(element)).flat(1);
```


## Pass

```js
const foo = bar.flatMap(element => unicorn(element));
```

```js
const foo = bar.map(element => unicorn(element)).flat(2);
```

```js
const foo = bar.map(element => unicorn(element)).foo().flat();
```

```js
const foo = bar.flat().map(element => unicorn(element));
```

## Related rules

- [unicorn/prefer-array-flat](./prefer-array-flat.md)
