# Enforce consistent relative url style

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

When using a relative url in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), the url should either never or always use `./` prefix consistently.

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
- `'always'`
  - Always add `./` prefix to the relative url when possible.

```js
// eslint unicorn/relative-url-style: ["error", "always"]
const url = new URL('foo', base); // Fail
const url = new URL('./foo', base); // Pass
```
