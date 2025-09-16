# Enforce consistent relative URL style

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When using a relative URL in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), the URL should either never or always use the `./` prefix consistently.

## Examples

```js
// ❌
const url = new URL('./foo', base);

// ✅
const url = new URL('foo', base);
```

## Options

Type: `string`\
Default: `'never'`

- `'never'` (default)
  - Never use a `./` prefix.
- `'always'`
  - Always add a `./` prefix to the relative URL when possible.

```js
// eslint unicorn/relative-url-style: ["error", "always"]

// ❌
const url = new URL('foo', base);

// ✅
const url = new URL('./foo', base);
```
