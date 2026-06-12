# prefer-location-assign

📝 Prefer `location.assign()` over assigning to `location.href`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`Location#assign()`](https://developer.mozilla.org/en-US/docs/Web/API/Location/assign) when intentionally navigating to a new URL while preserving the current page in session history.

Use [`Location#replace()`](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace) instead when the current page should not remain in session history, for example redirects where the back button should skip the replaced page.

## Examples

```js
// ❌
location.href = url;

// ✅
location.assign(url);
```

```js
// ❌
window.location.href = url;

// ✅
window.location.assign(url);
```
