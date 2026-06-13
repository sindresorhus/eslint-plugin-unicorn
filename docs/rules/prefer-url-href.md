# prefer-url-href

📝 Prefer `URL#href` over stringifying a `URL`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `URL#href` over explicit URL stringification.

The `href` property is the native way to get the serialized URL string.

This rule detects direct `new URL()` expressions, references to `const` variables initialized from `new URL()`, TypeScript `URL` annotations, and TypeScript type information when available. It intentionally does not follow assignments or arbitrary aliases without annotations or type information.

## Examples

```js
// ❌
new URL('https://example.com').toString();

// ✅
new URL('https://example.com').href;
```

```js
// ❌
const url = new URL('https://example.com');
String(url);

// ✅
const url = new URL('https://example.com');
url.href;
```

```ts
// ❌
function stringify(url: URL) {
	return url.toString();
}

// ✅
function stringify(url: URL) {
	return url.href;
}
```
