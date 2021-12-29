# Enforce consistent relative url style

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

When using a relative url in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), the path should be always or never use `./` prefix.

## Fail

```js
const url = new URL('./foo', base);
```

## Pass

```js
const url = new URL('foo', base);
```

## Options

Type: `string`\
Default: `'never'`

- `'never'` (default)
  - Never use `./` prefix.
- `'only-single-line'`
  - Always add `./` prefix to the relative url when possible.

```js
// eslint unicorn/relative-url-style.md: ["error", "always"]
const url = new URL('foo', base); // Invalid
const url = new URL('/foo', base); // Valid
```
