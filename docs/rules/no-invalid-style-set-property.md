# no-invalid-style-set-property

📝 Disallow invalid arguments to `CSSStyleDeclaration#setProperty()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`CSSStyleDeclaration#setProperty()`](https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-setproperty) uses CSS property names and a separate priority argument. Several invalid arguments silently leave the declaration unchanged.

This rule reports:

- Recognized camelCase property names, such as `backgroundColor`, `cssFloat`, and `webkitTransform`.
- Top-level `!important` in the value, including CSS whitespace, comments, casing, and identifier escapes.
- Invalid primitive priorities when the value is statically known to convert to a nonempty string.

Ordinary CSS property names and the `important` priority are case-insensitive. Custom property names such as `--brandColor` keep their case. Unknown property names are ignored; this rule does not validate general CSS property names or values.

## Examples

```js
// ❌
element.style.setProperty('backgroundColor', 'red');
element.style.setProperty('color', 'red !important');
element.style.setProperty('color', 'red', '!important');
element.style.setProperty('color', 'red', ' important ');

// ✅
element.style.setProperty('background-color', 'red');
element.style.setProperty('color', 'red', 'important');
element.style.setProperty('color', 'red', 'IMPORTANT');
element.style.setProperty('--brandColor', 'red');
```

Quoted CSS content, URLs, comments, and nested functions or blocks are preserved:

```js
style.setProperty('content', '"!important"');
style.setProperty('background-image', 'url("!important")');
style.setProperty('--tokens', 'var(--other, !important)');
```

An empty string or `null` value removes the property regardless of the priority. Dynamic values are also ignored when checking priorities because they could be empty. `undefined` values convert to the nonempty string `"undefined"`.

```js
style.setProperty('color', '', '!important');
style.setProperty('color', null, false);
style.setProperty('color', value, priority);
```

## Detection and suggestions

The rule assumes receivers named `style` or accessed through `.style` are CSS style declarations unless they have a known unrelated type. TypeScript annotations and type information also recognize `CSSStyleDeclaration` and `CSSStyleProperties` receivers with other names. Computed method names, detached calls, and spreads among the first three arguments are ignored. Extra arguments are ignored.

Arguments are checked when their values can be safely determined, including literals, constant templates, and immutable constants. Unknown values are ignored.

Corrections are offered as editor suggestions because they change runtime behavior. Suggestions replace directly editable strings with recognized CSS names or correct recognizable malformed priorities. A single trailing `!important` can be moved into the priority argument when the remaining value is nonempty, the priority is absent or directly editable and valid, and no comments need to be removed or relocated. Other cases are reported without a suggestion.
