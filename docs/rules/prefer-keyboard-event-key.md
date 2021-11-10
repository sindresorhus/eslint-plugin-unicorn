# Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

Enforces the use of [`KeyboardEvent#key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) over [`KeyboardEvent#keyCode`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode) which is deprecated. The `.key` property is also more semantic and readable.

This rule is partly fixable. It can only fix direct property access.


## Fail

```js
window.addEventListener('keydown', event => {
	console.log(event.keyCode);
});
```

```js
window.addEventListener('keydown', event => {
	if (event.keyCode === 8) {
		console.log('Backspace was pressed');
	}
});
```


## Pass

```js
window.addEventListener('click', event => {
	console.log(event.key);
});
```

```js
window.addEventListener('keydown', event => {
	if (event.key === 'Backspace') {
		console.log('Backspace was pressed');
	}
});
```
