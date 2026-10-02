# no-url-in-search-params

📝 Disallow passing full URLs to `URLSearchParams`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`URLSearchParams` parses query strings, not full URLs. A URL string makes the URL prefix part of the first parameter name and leaves the fragment intact; a URL object is treated as a record instead of having its query extracted.

```js
const parameters = new URLSearchParams('https://example.com/?query=hello');
parameters.get('query'); // null
parameters.get('https://example.com/?query'); // 'hello'
```

This rule checks direct `new URLSearchParams(input)` calls with statically known URL strings beginning with `scheme://`, known `URL` objects, or their `.href` values. It also checks `location.href`, including through `window`, `globalThis`, `document`, and `self`. URL objects are recognized through constructors, constant references, TypeScript annotations, and optional type information.

Suggestions extract the query, offering detached copies or live parameters as shown below. There is no automatic fix because this changes behavior.

## Examples

```js
// ❌
const parameters = new URLSearchParams('https://example.com/?query=hello');

// ✅
const parameters = new URL('https://example.com/?query=hello').searchParams;
```

```js
const url = new URL(input);

// ❌
const parameters = new URLSearchParams(url.href);

// ❌
const parameters = new URLSearchParams(url);

// ✅ Detached copy: changing parameters does not update url.
const parameters = new URLSearchParams(url.search);

// ✅ Live parameters: changing parameters updates url, and vice versa.
const parameters = url.searchParams;
```

```js
// ❌
const parameters = new URLSearchParams(window.location.href);

// ✅
const parameters = new URLSearchParams(window.location.search);
```

## Limitations

Constructor and `.href` aliases and URL subclasses are unsupported. Mutable URL bindings need annotations or type information. Built-ins are assumed to be unshadowed and unmodified.

Comments may suppress suggestions. With `no-unreadable-new-expression`, assign inline URLs to variables first.

See the [URL Standard](https://url.spec.whatwg.org/#urlsearchparams) for the parsing algorithm.
