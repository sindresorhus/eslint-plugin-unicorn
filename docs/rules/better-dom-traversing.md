# better-dom-traversing

📝 Prefer better DOM traversal APIs.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer more readable and robust DOM traversal APIs.

Use named first-child properties instead of positional access, selectors instead of positional child traversal, `.closest()` instead of repeated parent traversal, and merged `.querySelector()` calls when static selectors can be combined.

This rule is syntax-based and reports common DOM traversal patterns. Suggestions are intentionally manual because the replacement can change behavior in some cases, such as `undefined` versus `null` for empty child collections, exact-depth parent traversal versus selector-based ancestor lookup, or chained `querySelector()` calls that only search inside the first matching element.

`props.children` access is ignored because it is component data, not DOM traversal.

## Examples

```js
// ❌
element.childNodes[0];

// ✅
element.firstChild;
```

```js
// ❌
element.children[0];

// ✅
element.firstElementChild;
```

```js
// ❌
element.children[2];

// ✅
element.querySelector(':scope selector');
```

```js
// ❌
element.parentElement.parentElement;

// ✅
element.closest('selector');
```

```js
// ❌
element.querySelector('a').querySelector('b');

// ✅
element.querySelector(':scope a b');
```
