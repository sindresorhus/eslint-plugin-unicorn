# no-invalid-response-options

📝 Disallow invalid options in `new Response()`, `Response.json()`, and `Response.redirect()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Invalid status and body combinations throw at runtime, even with an empty string or buffer, as defined by the [Fetch standard](https://fetch.spec.whatwg.org/#dom-response).

This rule checks:

- `new Response()` and `Response.json()` statuses outside the range 200 to 599, inclusive.
- Non-nullish bodies with status 204, 205, or 304. `Response.json()` creates a body even when its data is `null`.
- `Response.redirect()` statuses other than 301, 302, 303, 307, or 308.

## Examples

```js
// ❌
new Response('', {status: 204});
new Response(new Uint8Array(), {status: 205});
Response.json(data, {status: 304});
Response.json(null, {status: 204});
new Response(undefined, {status: 101});
Response.json(data, {status: 600});
Response.redirect(url, 200);

// ✅
new Response(undefined, {status: 204});
new Response(null, {status: 205});
new Response(undefined, {status: 304});
new Response('', {status: 200});
Response.json(data, {status: 200});
Response.redirect(url, 302);
Response.redirect(url);
```

The rule suggests replacing a forbidden, statically known primitive constructor body with `undefined` when comments and side effects are preserved. It has no autofixes.

## Detection

Checks direct calls with inline constructor or JSON options objects, using conservative static evaluation and [Web IDL status conversion](https://webidl.spec.whatwg.org/#es-unsigned-short). Constructor body conflicts require a provably non-nullish body.

Skips unknown values or overrides, aliases, qualified globals, optional or computed method calls, and spread arguments in the first two positions. Assumes unshadowed built-ins. Headers, `statusText`, and redirect URLs are not checked.
