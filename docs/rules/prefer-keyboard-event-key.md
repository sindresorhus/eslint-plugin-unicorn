# prefer-keyboard-event-key

📝 Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of [`KeyboardEvent#key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) over [`KeyboardEvent#keyCode`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode) which is deprecated. The `.key` property is also more semantic and readable.

This rule is partly fixable. It can only fix direct property access.

## Examples

```js
// ❌
window.addEventListener('keydown', event => {
	if (event.keyCode === 8) {
		console.log('Backspace was pressed');
	}
});

// ✅
window.addEventListener('keydown', event => {
	if (event.key === 'Backspace') {
		console.log('Backspace was pressed');
	}
});
```

```js
// ❌
window.addEventListener('keydown', event => {
	console.log(event.keyCode);
});
```

```js
// ✅
window.addEventListener('click', event => {
	console.log(event.key);
});
```
