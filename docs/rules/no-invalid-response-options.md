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

Checks direct calls with inline constructor or JSON options objects, including TypeScript assertions. A later spread or unknown computed key prevents checking the status.

Checks statically known number, string, boolean, `null`, and `undefined` statuses. Evaluation supports literals, unary operations on primitive literals or built-in constants, templates with primitive literal interpolations, and constants initialized directly with these forms. Constant aliases and compound expressions are skipped. Values follow [Web IDL unsigned short conversion](https://webidl.spec.whatwg.org/#es-unsigned-short); omitted or undefined statuses default to 200 for construction and 302 for redirects.

Constructor bodies must be provably non-nullish. Unknown variables and function results are skipped.

Aliases, qualified globals, optional or computed method calls, spread arguments in the first two positions, and status accessors are skipped. Built-ins are assumed to be unshadowed. Headers, `statusText`, and redirect URLs are outside this rule's scope.

Related rules: [`no-invalid-fetch-options`](./no-invalid-fetch-options.md), [`no-unnecessary-fetch-options`](./no-unnecessary-fetch-options.md), [`no-invalid-argument-count`](./no-invalid-argument-count.md), [`prefer-response-static-json`](./prefer-response-static-json.md), and [`no-null`](./no-null.md).
