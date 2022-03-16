# Enforce consistent relative URL style

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

When using a relative URL in [`new URL()`](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL), the URL should either never or always use the `./` prefix consistently.

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
  - Never use a `./` prefix.
- `'always'`
  - Always add a `./` prefix to the relative URL when possible.

```js
// eslint unicorn/relative-url-style: ["error", "always"]
const url = new URL('foo', base); // Fail
const url = new URL('./foo', base); // Pass
```
