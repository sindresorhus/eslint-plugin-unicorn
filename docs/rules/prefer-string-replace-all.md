# Prefer `String#replaceAll()` over regex searches with the global flag

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

The [`String#replaceAll()`](https://github.com/tc39/proposal-string-replaceall) method is both faster and safer as you don't have to escape the regex if the string is not a literal.

## Fail

```js
string.replace(/This has no special regex symbols/g, '');
```

```js
string.replace(/\(It also checks for escaped regex symbols\)/g, '');
```

```js
string.replace(/Works for u flag too/gu, '');
```

## Pass

```js
string.replace(/Non-literal characters .*/g, '');
```

```js
string.replace(/Extra flags/gi, '');
```

```js
string.replace('Not a regex expression', '')
```

```js
string.replaceAll('Literal characters only', '');
```
