# prefer-dom-node-remove

📝 Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Node#remove()`](https://developer.mozilla.org/en-US/docs/Web/API/ChildNode/remove) is a cleaner and more direct way to remove an element from the DOM. It's simpler, more readable, and doesn't require a reference to the parent node.

## Examples

```js
// ❌ - Requires knowing the parent and using the indirect method
const element = document.querySelector('.banner');
element.parentNode.removeChild(element);

// ✅ - Direct, straightforward removal
const element = document.querySelector('.banner');
element.remove();
```

```js
// ❌
const button = document.getElementById('close-btn');
button.parentNode.removeChild(button);

// ✅
const button = document.getElementById('close-btn');
button.remove();
```

```js
// ❌
class Modal {
	close() {
		this.parentNode.removeChild(this);
	}
}

// ✅
class Modal {
	close() {
		this.remove();
	}
}
```
