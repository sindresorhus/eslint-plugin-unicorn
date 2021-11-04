# Require `Array.isArray()` instead of `instanceof Array`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

The `instanceof Array` check doesn't work across realms/contexts, for example, frames/windows in browsers or the `vm` module in Node.js.


## Fail

```js
array instanceof Array;
[1,2,3] instanceof Array;
```


## Pass

```js
Array.isArray(array);
Array.isArray([1,2,3]);
```
