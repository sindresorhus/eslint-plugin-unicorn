# no-invalid-integrity

📝 Disallow invalid subresource integrity metadata.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Checks existing `integrity` attributes on HTML and native JSX `<script>` and `<link>` elements for malformed subresource integrity metadata. A malformed recognized hash can block a resource, while a value containing only unknown algorithms can leave integrity checking ineffective.

This rule validates the structure of metadata locally. It does not download resources, compare hashes with resource contents, verify signatures, or require an `integrity` attribute. It provides no autofixes or suggestions because the correct hash or public key cannot be inferred.

## Examples

```html
<!-- ❌ -->
<script src="app.js" integrity="sha256-abc"></script>
<script src="app.js" integrity="sha25-abc"></script>
<link rel="stylesheet" href="style.css" integrity="sha384-not-a-digest">

<!-- ✅ -->
<script src="app.js" integrity="sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ="></script>
<script src="app.js" integrity="sha256-LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ"></script>
<link rel="stylesheet" href="style.css" integrity="sha384-WeF0h3dEjGnea4ANejO7+5/xtGPkQ1TDVTvNucZm+pASWjx5+QOXvfX2oT3oKGhP">
<script src="app.js" integrity="ed25519-JrQLj5P/89iXES9+vFgrIy29clF9CC/oPPsw3c5D0bs="></script>
<script src="app.js"></script>
```

```jsx
// ❌
<script src="app.js" integrity={"sha256-" + "abc"} />;

// ✅
const integrity = 'sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=';
<script src="app.js" integrity={integrity} />;
```

## Accepted metadata

Algorithm names are case-sensitive and must be lowercase. Each recognized entry must contain the algorithm, a `-`, and a base64-encoded digest or public key of the following length:

| Algorithm | Material | Bytes | Base64 characters, excluding padding |
| --- | --- | --- | --- |
| `sha256` | Digest | 32 | 43 |
| `sha384` | Digest | 48 | 64 |
| `sha512` | Digest | 64 | 86 |
| `ed25519` | Public key | 32 | 43 |

Standard (`+`, `/`) and URL-safe (`-`, `_`) base64 characters can be used, including mixed alphabets. Zero to two trailing `=` padding characters are allowed; canonical padding and unused trailing bits are not enforced.

Entries are separated by HTML ASCII whitespace: spaces, tabs, line feeds, form feeds, or carriage returns. Empty and whitespace-only values are allowed. Entries may include a `?options` suffix. Options may be empty or contain ASCII characters from `!` through `~`, including additional `?` separators; they are not interpreted.

Unknown entries are allowed alongside recognized metadata for forward compatibility. A nonempty value containing no recognized algorithm is reported. Every malformed recognized entry is reported, even when another entry contains a valid or stronger hash.

These checks follow the [SRI metadata grammar](https://www.w3.org/TR/sri/#parse-metadata), the [CSP base64 grammar](https://w3c.github.io/webappsec-csp/#grammardef-base64-value), and [signature-based integrity metadata](https://wicg.github.io/signature-based-sri/).

## Static values

HTML tag and attribute names are matched case-insensitively, and character references in values are decoded. The first explicit `integrity` attribute is checked. Markup inside `<textarea>`, `<title>`, and `<iframe>` is ignored, as are dynamic template names or values, configured template delimiters, and values containing common template markers (`{{`, `{%`, `<%`, or `${`).

> [!NOTE]
> The HTML parser can omit attributes after an unquoted URL containing `/`, so an `integrity` attribute following such a URL may not be checked. Quote URL attribute values to avoid this parser limitation.

In JSX, only lowercase native `<script>` and `<link>` elements with an `integrity` prop are checked. String literals and safely resolved static string expressions, including constants, concatenations, and TypeScript assertions, are supported. The last explicit `integrity` prop is checked unless a later spread could overwrite it. Custom components, unresolved expressions, and nonstring values are ignored.
