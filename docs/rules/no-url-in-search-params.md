# no-url-in-search-params

📝 Disallow passing full URLs to `URLSearchParams`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`URLSearchParams` parses a query string, not a full URL. Passing a full URL treats the URL prefix as part of the first parameter name and includes any fragment in the parameter values.

```js
const parameters = new URLSearchParams('https://example.com/?query=hello');
parameters.get('query'); // null
parameters.get('https://example.com/?query'); // 'hello'
```

This rule reports statically known, valid URLs beginning with `scheme://`, including string literals, constant templates, concatenations, and constant references. It also reports `.href` on known `URL` receivers and on `location`, `window.location`, `globalThis.location`, `document.location`, and `self.location`.

Known `URL` receivers include direct constructors, constant references, TypeScript `URL` annotations, and TypeScript type information when available. Type information is optional.

The rule provides suggestions instead of automatic fixes because extracting the query changes behavior. For a URL string, it suggests parsing the URL and using its `searchParams`. For a known URL receiver, it offers a detached copy first, followed by access to the URL's live `searchParams`. For browser location inputs, it suggests constructing from `.search`.

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

For string inputs, the rule intentionally skips dynamic templates, relative URLs, and opaque schemes such as `mailto:` and `data:`. Known URL `.href` inputs are reported regardless of the URL scheme.

The rule skips arbitrary objects with `.href`, computed or optional property access, constructor aliases, and unannotated mutable URL bindings. It does not infer URL subclasses, follow aliases of `.href` values, or resolve shadowed built-ins, and assumes built-ins have not been modified.

Suggestions that replace the whole constructor are omitted when it contains comments. Replacing only `.href` with `.search` preserves comments and remains available.

If you enable the opt-in `no-unreadable-new-expression` rule, assign the parsed URL to a variable before accessing `.searchParams` instead of using the inline suggestion.

See the [URL Standard](https://url.spec.whatwg.org/#urlsearchparams) for the parsing algorithm.
