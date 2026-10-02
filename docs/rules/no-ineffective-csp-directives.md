# no-ineffective-csp-directives

📝 Disallow ineffective CSP directives in `<meta>` elements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Browsers ignore the `frame-ancestors`, `sandbox`, and `report-uri` Content Security Policy (CSP) directives when the policy is delivered through a `<meta>` element. The markup can give the impression that framing restrictions, sandbox restrictions, or violation reporting are active when they are not.

This rule reports those three directives in static CSP `<meta>` elements in HTML and JSX. It follows the [HTML processing algorithm](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-content-security-policy) and [CSP specification](https://www.w3.org/TR/CSP3/#delivery-html-meta-element).

## Examples

```html
<!-- ❌ -->
<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'; sandbox">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; report-uri /csp-reports">

<!-- ✅ -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'">
```

```jsx
// ❌
<meta httpEquiv="Content-Security-Policy" content="frame-ancestors 'none'; sandbox" />;

// ❌
const policy = "default-src 'self'; report-uri /csp-reports";
<meta httpEquiv="Content-Security-Policy" content={policy} />;

// ✅
<meta httpEquiv="Content-Security-Policy" content="default-src 'self'" />;
```

To activate the intended behavior, deliver the policy through an HTTP response header:

```http
Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; sandbox; report-uri /csp-reports
```

The rule has no autofix or suggestions because removing a directive from the markup does not activate the intended protection or reporting.

## HTML usage

For HTML files, configure the [`@html-eslint/eslint-plugin`](https://html-eslint.org) language plugin:

```js
import html from '@html-eslint/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';

export default [
	{
		files: ['**/*.html'],
		plugins: {
			html,
			unicorn,
		},
		language: 'html/html',
		rules: {
			'unicorn/no-ineffective-csp-directives': 'error',
		},
	},
];
```

For JSX, enable JSX parsing in your JavaScript or TypeScript parser configuration. The rule is included in the `recommended` and `unopinionated` configs.

## Details

- HTML tag and attribute names, the `Content-Security-Policy` value, and directive names are case-insensitive. Whitespace surrounding the `http-equiv` value is not ignored.
- HTML character references are decoded. Quoted and unquoted attribute values are supported.
- JSX checks lowercase `<meta>` elements with `httpEquiv` or `http-equiv`. It checks strings and expressions that can be conservatively evaluated as strings, including local constants and composed template literals.
- Each distinct ineffective directive produces one report on the `content` value, in source order. Repeated occurrences of the same directive do not produce additional reports.

## Limitations

This is not a general CSP security audit. It does not validate policy syntax or strength, placement within `<head>`, unknown directives, `report-to`, report-only meta policies, or HTTP response headers.

HTML opening tags containing configured template expressions are ignored. JSX elements with spreads or duplicate relevant attributes are ignored, as are unresolved or mutable expression values and custom components. JavaScript DOM construction and framework-specific templates are not checked.

HTML text that looks like a `<meta>` element inside raw-text containers such as `<iframe>` is not supported and may be reported.
