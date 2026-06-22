# prefer-toggle-attribute

📝 Prefer using `Element#toggleAttribute()` to toggle attributes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Element#toggleAttribute()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/toggleAttribute) instead of conditionally calling `setAttribute()` and `removeAttribute()` for empty boolean-style attributes.

The rule intentionally only handles `setAttribute(name, '')`, because `toggleAttribute()` creates an empty-string attribute. Rewriting non-empty attribute values could change observable behavior.

`data-*` attributes are ignored so `dom-node-dataset` remains responsible for dataset-specific style.

Only direct presence toggles based on `hasAttribute()` are autofixed. Condition-driven `toggleAttribute(name, force)` replacements are suggestions, because `toggleAttribute(name, true)` preserves an existing non-empty attribute value while `setAttribute(name, '')` clears it.

Optional receivers are only handled for direct `hasAttribute()` presence toggles. Generic condition-driven optional receiver branches are ignored because `element?.toggleAttribute(name, condition)` would skip evaluating `condition` when `element` is nullish.

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
