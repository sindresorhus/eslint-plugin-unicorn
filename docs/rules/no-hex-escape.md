# Enforce the use of Unicode escapes instead of hexadecimal escapes

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

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
