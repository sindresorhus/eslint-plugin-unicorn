# no-unnecessary-fetch-options

📝 Disallow unnecessary options in `fetch()` and `new Request()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Redundant [`fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) and [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) options make the request harder to scan.

The rule removes options that are equivalent to omission. Some `RequestInit` defaults are only equivalent when the input is known not to be an existing `Request`, because omitted options inherit from the input request.

## Examples

```js
// ❌
await fetch('/', {});

// ✅
await fetch('/');
```

```js
// ❌
await fetch('/', {method: 'GET'});

// ✅
await fetch('/');
```

```js
// ❌
await fetch('/', {credentials: 'same-origin'});

// ✅
await fetch('/');
```

```js
// ❌
await fetch(url, {signal: undefined});

// ✅
await fetch(url);
```

```js
// ❌
new Request(url, {body: null});

// ✅
new Request(url);
```

```js
// ✅
await fetch(request, {method: 'GET'});
```
