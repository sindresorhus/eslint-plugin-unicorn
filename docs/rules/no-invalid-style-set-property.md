# no-invalid-style-set-property

📝 Disallow invalid arguments to `CSSStyleDeclaration#setProperty()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`CSSStyleDeclaration#setProperty()`](https://drafts.csswg.org/cssom/#dom-cssstyledeclaration-setproperty) uses CSS property names and a separate priority argument. Invalid arguments can silently leave the declaration unchanged.

This rule reports:

- Recognized camelCase property names, such as `backgroundColor`, `cssFloat`, and `webkitTransform`.
- Top-level `!important` in the value, including CSS whitespace, comments, casing, and identifier escapes.
- Invalid primitive priorities when the value is statically known to convert to a nonempty string.

CSS property names and the `important` priority are case-insensitive, except custom properties such as `--brandColor`. Unknown names are ignored; general CSS validation is outside this rule's scope.

## Examples

```js
// ❌
element.style.setProperty('backgroundColor', 'red');

// ✅
element.style.setProperty('background-color', 'red');
```

```js
// ❌
element.style.setProperty('color', 'red !important');

// ✅
element.style.setProperty('color', 'red', 'important');
```

```js
// ❌
element.style.setProperty('color', 'red', '!important');

// ✅
element.style.setProperty('color', 'red', 'important');
```

```js
// ❌
element.style.setProperty('color', 'red', ' important ');

// ✅
element.style.setProperty('color', 'red', 'IMPORTANT');
```

Quoted CSS content, URLs, comments, and nested functions or blocks are preserved:

```js
style.setProperty('content', '"!important"');
style.setProperty('background-image', 'url("!important")');
style.setProperty('--tokens', 'var(--other, !important)');
```

An empty string or `null` value removes the property regardless of priority. Dynamic values suppress priority checks because they could be empty. `undefined` becomes the nonempty string `"undefined"`.

```js
style.setProperty('color', '', '!important');
style.setProperty('color', null, false);
style.setProperty('color', value, priority);
```

## Detection and suggestions

Checks statically known arguments in direct `.setProperty()` calls on `style`, `.style`, or receivers typed as `CSSStyleDeclaration` or `CSSStyleProperties`. Known unrelated types, computed methods, detached calls, and spreads among the first three arguments are ignored. Extra arguments are ignored.

Editor suggestions correct directly editable property names and recognizable priority typos. They can also move a single trailing `!important` if a nonempty value remains, the priority is absent or editable and valid, and comments are preserved. Corrections use suggestions because they change runtime behavior.
