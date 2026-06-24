# prefer-error-is-error

📝 Prefer `Error.isError()` when checking for errors.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Error.isError()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/isError) is a robust way to check whether a value is an error object.

`instanceof Error` is unreliable across realms, and `Object.prototype.toString.call(error) === '[object Error]'` can be spoofed with `Symbol.toStringTag`.

Unlike [`unicorn/no-instanceof-builtins`](./no-instanceof-builtins.md), this rule also catches legacy `Error` brand checks using `'[object Error]'`.

## Examples

```js
// ❌
error instanceof Error;

// ✅
Error.isError(error);
```

```js
// ❌
Object.prototype.toString.call(error) === '[object Error]';

// ✅
Error.isError(error);
```

```js
// ❌
Object.prototype.toString.call(error) !== '[object Error]';

// ✅
!Error.isError(error);
```

```js
// ✅
error instanceof TypeError;
```

## Related rules

- [unicorn/no-instanceof-builtins](./no-instanceof-builtins.md)
