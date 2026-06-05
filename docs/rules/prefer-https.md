# prefer-https

📝 Prefer HTTPS over HTTP.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using HTTPS avoids sending URLs to public resources over an insecure protocol.

This rule checks source text, including strings, template literals, JSX, comments, and non-JavaScript files when they are linted with ESLint language plugins such as [`@eslint/css`](https://github.com/eslint/css), [`@eslint/json`](https://github.com/eslint/json), [`@eslint/markdown`](https://github.com/eslint/markdown), and [`html-eslint`](https://html-eslint.org).

URLs without a public-looking top-level domain are ignored. For example, `http://localhost`, `http://example`, and `http://127.0.0.1` are allowed.

## Examples

```js
// ❌
const url = 'http://sindresorhus.com';

// ✅
const url = 'https://sindresorhus.com';
```

```js
// ❌
// See http://sindresorhus.com

// ✅
// See https://sindresorhus.com
```

```jsx
// ❌
const element = <a href="http://sindresorhus.com">http://sindresorhus.com</a>;

// ✅
const element = <a href="https://sindresorhus.com">https://sindresorhus.com</a>;
```
