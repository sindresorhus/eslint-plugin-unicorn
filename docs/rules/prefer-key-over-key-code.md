# Enforce the use of event.key instead of event.keyCode

Enforces use of [key](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) which is more semantic and easy to follow in code.

## Fail

```js
window.addEventListener("keyDown", e => {
	console.log(e.keyCode);
});
```

```js
let wasBackspaceUsed = false;
window.addEventListener("keydown", e => {
	if (e.keyCode === 8) wasBackspaceUsed = true;
});
```

## Pass

```js
window.addEventListener("click", e => {
	console.log(e.key);
});
```

```js
let wasBackspaceUsed = false;
window.addEventListener("keydown", e => {
	if (e.key === "Backspace") wasBackspaceUsed = true;
});
```
