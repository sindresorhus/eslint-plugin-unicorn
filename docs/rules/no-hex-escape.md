# Enforce the use of Unicode escapes instead of hexadecimal escapes

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
