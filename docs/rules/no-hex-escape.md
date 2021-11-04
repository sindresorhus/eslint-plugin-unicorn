# Enforce the use of Unicode escapes instead of hexadecimal escapes

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

Enforces a convention of using [Unicode escapes](https://mathiasbynens.be/notes/javascript-escapes#unicode) instead of [hexadecimal escapes](https://mathiasbynens.be/notes/javascript-escapes#hexadecimal) for consistency and clarity.


## Fail

```js
const foo = '\x1B';
const foo = `\x1B${bar}`;
```


## Pass

```js
const foo = '\u001B';
const foo = `\u001B${bar}`;
```
