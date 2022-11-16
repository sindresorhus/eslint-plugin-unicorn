# Prefer `String#replaceAll()` over regex searches with the global flag

✅ This rule is _disabled_ in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`String#replaceAll()`](https://github.com/tc39/proposal-string-replaceall) method is both faster and safer as you don't have to escape the regex if the string is not a literal.
Even if regexp has to be used, `String#replaceAll()` has more clear intention.

## Fail

```js
string.replace(/RegExp with global flag/igu, '');
```

```js
string.replace(/RegExp without special symbols/g, '');
```

```js
string.replace(/\(It also checks for escaped regex symbols\)/g, '');
```

```js
string.replace(/Works for u flag too/gu, '');
```

## Pass

```js
string.replace(/Non-global regexp/iu, '');
```

```js
string.replace('Not a regex expression', '')
```

```js
string.replaceAll('string', '');
```

```js
string.replaceAll(/\s/, '');
```
