# prefer-location-assign

📝 Prefer `location.assign()` over assigning to `location.href`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Location#assign()`](https://developer.mozilla.org/en-US/docs/Web/API/Location/assign) is more explicit and semantic than assigning to `.href`. Use `assign()` when you want to preserve the current page in browser history (user can go back), and [`Location#replace()`](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace) when you want to replace the current history entry.

## Examples

```js
// ❌ - Assigns to a property (less semantic)
location.href = url;

// ✅ - Method call is more explicit
location.assign(url);
```

```js
// ✅ - Normal navigation, user can go back
const loginUrl = 'https://example.com/login';
location.assign(loginUrl);
```

```js
// ✅ - Use replace() for redirects where user shouldn't go back
if (isLoggedOut) {
	location.replace('/login'); // Can't go back to protected page
}
```

```js
// ✅ - assign() for user-initiated navigation
button.onclick = () => location.assign('/next-page');

// ✅ - replace() for authentication redirects
if (!hasValidToken) {
	location.replace('/login');
}
```
