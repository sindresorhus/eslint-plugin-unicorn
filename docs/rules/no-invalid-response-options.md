# no-invalid-response-options

📝 Disallow invalid options in `new Response()`, `Response.json()`, and `Response.redirect()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [Fetch standard](https://fetch.spec.whatwg.org/#dom-response) restricts the status and body combinations accepted by `Response` APIs. Invalid combinations throw at runtime, even when the body is an empty string or an empty buffer.

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

For forbidden constructor bodies, the rule offers a suggestion to replace a statically known primitive body with `undefined` when doing so preserves comments and removes no side effects. Suggestions are not offered for object or array bodies, since their implicit string conversion can have side effects. It does not automatically change bodies or statuses, since the intended response is a choice for the developer.

## Detection

The rule checks direct `new Response()`, `Response.json()`, and `Response.redirect()` calls. Constructor and JSON options must be inline object literals. It handles quoted and static computed status keys, duplicate keys, parentheses, and TypeScript assertions. A spread or unknown computed key after the last status property prevents checking that status.

Status values can be statically known numbers, strings, booleans, `null`, or `undefined`. They follow [Web IDL unsigned short conversion](https://webidl.spec.whatwg.org/#es-unsigned-short), including truncation and wrapping. An omitted or undefined status defaults to 200 for construction and 302 for redirects.

Static evaluation is limited to literals, unary operations on primitive literals or built-in constants, templates containing only primitive literal interpolations, and constants initialized directly with these forms. Constant aliases and compound expressions, such as conditionals and arithmetic involving variables, are not evaluated. This prevents object coercion from producing false reports or removing side effects in suggestions.

Constructor body checks require a known non-nullish value or a direct template literal, object literal, array literal, or constructor expression. Unknown variables and function results are skipped because they may be `null` or `undefined`.

```js
// Not checked because the body may be nullish.
new Response(body, {status: 204});
new Response(getBody(), {status: 204});

// Not checked because options are not an inline object literal.
const options = {status: 204};
new Response('', options);
```

Aliases, subclasses, qualified globals, optional calls, computed method calls, and spread arguments within the first two argument positions are not checked. The rule assumes `Response`, `undefined`, `NaN`, and `Infinity` refer to the built-ins. Object, symbol, and BigInt status values, status accessors, headers, `statusText`, and redirect URL validity are outside its scope.

This rule complements [`no-invalid-fetch-options`](./no-invalid-fetch-options.md), [`no-unnecessary-fetch-options`](./no-unnecessary-fetch-options.md), [`no-invalid-argument-count`](./no-invalid-argument-count.md), and [`prefer-response-static-json`](./prefer-response-static-json.md). It also works with [`no-null`](./no-null.md), which supports using `undefined` for a constructor's absent body.
