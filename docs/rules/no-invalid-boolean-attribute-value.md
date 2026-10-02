# no-invalid-boolean-attribute-value

📝 Disallow invalid values for HTML boolean attributes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

HTML boolean attributes are true whenever they are present, regardless of their value. For example, `button.setAttribute('disabled', 'false')` still disables the button.

The [HTML Standard](https://html.spec.whatwg.org/dev/common-microsyntaxes.html#boolean-attributes) permits only the empty string or the attribute's own name as its value, matched ASCII case-insensitively without leading or trailing whitespace. To represent false, remove the attribute.

This rule checks statically known primitive values passed to `setAttribute()` on identifiable native HTML elements. Non-string primitives are checked after conversion to strings, so both `false` and `'false'` are reported.

## Examples

```js
const button = document.createElement('button');

// ❌
button.setAttribute('disabled', 'false');
button.setAttribute('disabled', false);
button.setAttribute('disabled', 'true');
button.setAttribute('disabled', ' disabled ');

// ✅
button.removeAttribute('disabled');
button.setAttribute('disabled', '');
button.setAttribute('disabled', 'disabled');
button.setAttribute('disabled', 'DISABLED');
```

```js
// ❌
const input = document.querySelector('input.required');
input?.setAttribute('required', 'false');

// ✅
input?.removeAttribute('required');
input?.setAttribute('required', '');
```

## Attribute and receiver detection

Attribute applicability follows the [HTML attribute index](https://html.spec.whatwg.org/multipage/indices.html#attributes-3). Element-specific attributes are checked only on their applicable native elements. For example, `disabled` is checked on buttons, form controls, fieldsets, and links, but not on `div` elements. The global boolean attributes `autofocus`, `headingreset`, `inert`, and `itemscope` are checked on identified native HTML elements.

Receivers are identified through:

- `document.createElement()` without creation options, or `document.createElementNS()` with an explicit HTML namespace and no creation options.
- `document.querySelector()` with one native tag optionally followed by class or ID selectors, such as `button.primary#submit`.
- Simple `const` aliases of supported receivers or the global document, including `window.document`, `self.document`, and `globalThis.document`.
- Concrete native HTML element types from TypeScript variable and parameter annotations or type assertions, including type aliases and compatible nullable unions.
- Inferred concrete native HTML element types when TypeScript type information is available.

Queries for `a`, `script`, `style`, and `title` are ignored because those tag names also occur in SVG. Complex selectors, custom elements, creation options, custom subclasses, structural lookalikes, and unknown receivers are ignored. Generic `Element` and `HTMLElement` types alone do not establish a native element's identity. Explicit concrete native type assertions are trusted.

ARIA, `data-*`, enumerated attributes, JSX attributes, templates, property assignments, and `setAttributeNS()` are not checked. In particular, `hidden`, `draggable`, `contenteditable`, `spellcheck`, and `popover` are enumerated attributes. Input-state restrictions and document-tree conditions are not analyzed.

## Suggestions

For `false` and ASCII case-insensitive `'false'` strings, the rule suggests removing the attribute with `removeAttribute()`. For other invalid values, it suggests setting the value to the empty string.

Suggestions are withheld when they would remove or relocate comments. There is no automatic fix because removing an attribute changes its behavior, and normalizing its value changes what attribute reads observe.

This rule complements [`prefer-toggle-attribute`](prefer-toggle-attribute.md), which recognizes paired `setAttribute()` and `removeAttribute()` patterns rather than validating standalone attribute values.
