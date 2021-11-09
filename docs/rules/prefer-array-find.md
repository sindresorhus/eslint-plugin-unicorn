# Prefer `.find(…)` over the first element from `.filter(…)`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

[`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) breaks the loop as soon as it finds a match and doesn't create a new array.

This rule is fixable unless default values are used in declaration or assignment.

## Fail

```js
const item = array.filter(x => isUnicorn(x))[0];
```

```js
const item = array.filter(x => isUnicorn(x)).shift();
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
