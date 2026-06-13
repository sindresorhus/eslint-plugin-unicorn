# prefer-response-static-json

📝 Prefer `Response.json()` over `new Response(JSON.stringify())`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Response.json()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/json_static) is a cleaner and more explicit way to create JSON responses. It automatically stringifies the data and sets the correct `Content-Type` header to `application/json`, whereas manually using `JSON.stringify()` requires you to handle the content-type yourself.

## Examples

```js
// ❌
const response = new Response(JSON.stringify(data));

// ✅
const response = Response.json(data);
```

```js
// ❌
const response = new Response(JSON.stringify(users), {
	headers: {'Content-Type': 'application/json'},
});

// ✅
const response = Response.json(users);
```

```js
// ❌
const response = new Response(JSON.stringify({error: 'Not found'}), {
	status: 404,
	headers: {'Content-Type': 'application/json'},
});

// ✅
const response = Response.json({error: 'Not found'}, {status: 404});
```
