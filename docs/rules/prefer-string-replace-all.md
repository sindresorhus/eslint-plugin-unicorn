# Prefer `String#replaceAll()` over regex searches with the global flag

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

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
