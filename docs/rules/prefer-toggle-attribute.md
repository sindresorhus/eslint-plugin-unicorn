# prefer-toggle-attribute

📝 Prefer using `Element#toggleAttribute()` to toggle attributes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Element#toggleAttribute()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/toggleAttribute) instead of conditionally calling `setAttribute()` and `removeAttribute()` for boolean-style attributes.

Only `setAttribute(name, '')` patterns are autofixed. Non-empty static string values may get suggestions when safe.

`data-*` attributes are ignored so [`dom-node-dataset`](dom-node-dataset.md) remains responsible for dataset-specific style.

Only direct `hasAttribute()` toggles are autofixed. Condition-driven `toggleAttribute(name, force)` replacements are suggestions when safe, because `toggleAttribute(name, true)` preserves existing non-empty values.

Optional receivers are fixed or suggested only for direct `hasAttribute()` toggles. Generic condition-driven optional receivers are reported without fixes because `element?.toggleAttribute(name, condition)` would skip evaluating `condition` when `element` is nullish.

## Examples

```js
// ❌
if (element.hasAttribute('hidden')) {
	element.removeAttribute('hidden');
} else {
	element.setAttribute('hidden', '');
}

// ❌
element.hasAttribute('hidden')
	? element.removeAttribute('hidden')
	: element.setAttribute('hidden', '');

// ✅
element.toggleAttribute('hidden');
```

```js
// ❌
if (condition) {
	element.setAttribute('hidden', '');
} else {
	element.removeAttribute('hidden');
}

// ❌
condition
	? element.setAttribute('hidden', '')
	: element.removeAttribute('hidden');

// ✅
element.toggleAttribute('hidden', condition);
```
