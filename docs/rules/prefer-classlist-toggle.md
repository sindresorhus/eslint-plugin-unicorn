# Prefer using `Element#classList.toggle()` to toggle class names

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Element#classList.toggle()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList) instead of conditionally calling `classList.add()` and `classList.remove()`.

## Examples

```js
// ❌
if (condition) {
	element.classList.add('className');
} else {
	element.classList.remove('className');
}

// ❌
condition
	? element.classList.add('className')
	: element.classList.remove('className');

// ❌
element.classList[condition ? 'add' : 'remove']('className')

// ✅
element.classList.toggle('className', condition);
```
