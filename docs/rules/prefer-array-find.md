# Prefer `.find(…)` and `.findLast(…)` over the first or last element from `.filter(…)`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) and [`Array#findLast()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast) breaks the loop as soon as it finds a match and doesn't create a new array.

This rule is fixable unless default values are used in declaration or assignment.

## Fail

```js
const item = array.filter(x => isUnicorn(x))[0];
```

```js
const item = array.filter(x => isUnicorn(x)).at(-1);
```

```js
const item = array.filter(x => isUnicorn(x)).shift();
```

```js
const item = array.filter(x => isUnicorn(x)).pop();
```

```js
const [item] = array.filter(x => isUnicorn(x));
```

```js
[item] = array.filter(x => isUnicorn(x));
```

## Pass

```js
const item = array.find(x => isUnicorn(x));
```

```js
item = array.find(x => isUnicorn(x));
```

```js
const item = array.findLast(x => isUnicorn(x));
```

## Options

Type: `object`

### checkFromLast

Type: `boolean`\
Default: `true`

Pass `checkFromLast: false` to disable check cases searching from last.

#### Pass

```js
// eslint unicorn/prefer-array-find: ["error", {"checkFromLast": false}]
const item = array.filter(x => isUnicorn(x)).at(-1);
```

```js
// eslint unicorn/prefer-array-find: ["error", {"checkFromLast": false}]
const item = array.filter(x => isUnicorn(x)).pop();
```
