# no-invalid-url-protocol-comparison

📝 Disallow invalid protocol strings in comparisons with `URL#protocol`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`URL#protocol`](https://nodejs.org/api/url.html#urlprotocol) returns a lowercase scheme followed by a colon, such as `'https:'`. Comparing it with `'https'` or `'HTTPS:'` can never match. This rule automatically normalizes protocol strings in equality and inequality comparisons, `switch` cases, inline-array `.includes()`, `.indexOf()`, and `.lastIndexOf()` calls, and inline `new Set([...]).has()` calls.

The rule checks scheme names, including custom schemes such as `'web+demo'`, rather than a fixed list of protocols. Strings must start with an ASCII letter and contain only ASCII letters, digits, `+`, `-`, and `.`, optionally followed by a colon. Other malformed strings and empty strings are ignored.

## Examples

```js
// ❌
const url = new URL('https://example.com');
url.protocol === 'https';
url.protocol !== 'HTTP:';

// ✅
const url = new URL('https://example.com');
url.protocol === 'https:';
url.protocol !== 'http:';
```

```js
// ❌
const url = new URL('https://example.com');
switch (url.protocol) {
	case 'https': {
		break;
	}
}

// ✅
const url = new URL('https://example.com');
switch (url.protocol) {
	case 'https:': {
		break;
	}
}
```

```js
const url = new URL('https://example.com');

// ❌
['http', 'HTTPS:'].includes(url.protocol);
['https'].indexOf(url.protocol) !== -1;
new Set(['http', 'https']).has(url.protocol);

// ✅
['http:', 'https:'].includes(url.protocol);
['https:'].indexOf(url.protocol) !== -1;
new Set(['http:', 'https:']).has(url.protocol);
```

Assigning a colonless protocol is valid and is not reported:

```js
const url = new URL('http://example.com');
url.protocol = 'https';
```

## Detection limits

Without type information, the rule recognizes direct `new URL()` expressions and `const` bindings initialized from known URLs, including named `URL` imports from `node:url` or `url`. It also recognizes native `URL` type annotations in TypeScript.

With [typed linting](https://typescript-eslint.io/getting-started/typed-linting/) enabled, it also recognizes inferred native URL types. It can recognize a `URL | string` value after a guard such as `url instanceof URL`. Selecting the TypeScript parser alone does not enable type information. Type information recognizes TypeScript's built-in `URL` type; nested member types from Node.js imports are not recognized.

The rule does not infer URLs from variable names, arbitrary objects with a `protocol` property, or URL subclasses. A mixed type alone does not establish that the receiver is a native `URL`.

Only string literals and templates without substitutions are checked. Named collections, extracted protocol values, and dynamic strings are ignored. Prefix and substring checks such as `url.protocol.startsWith('http')` are valid and are not reported.

Fixes preserve surrounding comments and syntax. A `switch` label is reported without an automatic fix when normalization would collide with another literal label, including another label that requires normalization.
