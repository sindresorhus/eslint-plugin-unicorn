# Disallow `new Array()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The ESLint built-in rule [`no-array-constructor`](https://eslint.org/docs/rules/no-array-constructor) enforces using an array literal instead of the `Array` constructor, but it still allows using the `Array` constructor with **one** argument. This rule fills that gap.

When using the `Array` constructor with one argument, it's not clear whether the argument is meant to be the length of the array or the only element.

This rule is fixable if the value type of the argument is known.

## Fail

```js
const length = 10;
const array = new Array(length);
```

```js
const array = new Array(onlyElement);
```

```js
const array = new Array(...unknownArgumentsList);
```

## Pass

```js
const length = 10;
const array = Array.from({length});
```

```js
const array = [onlyElement];
```

```js
const array = [...items];
```
