# no-invalid-remove-event-listener

📝 Prevent calling `EventTarget#removeEventListener()` with the result of an expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener) function must be called with a reference to the same function that was passed to [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). Calling `removeEventListener` with an inline function or the result of an inline `.bind()` call is indicative of an error, and won't actually remove the listener.

## Examples

```js
// ❌
window.removeEventListener('click', listener.bind(window));

// ✅
window.removeEventListener('click', listener);
```

```js
// ✅
window.removeEventListener('click', getListener());
```

```js
// ❌
window.removeEventListener('click', () => {});
```

```js
// ❌
window.removeEventListener('click', function () {});
```

```js
// ❌
class MyElement extends HTMLElement {
	handler() {}

	disconnectedCallback() {
		this.removeEventListener('click', this.handler.bind(this));
	}
}

// ✅
class MyElement extends HTMLElement {
	constructor() {
		super();
		this.handler = this.handler.bind(this);
	}

	handler() {}

	disconnectedCallback() {
		this.removeEventListener('click', this.handler);
	}
}
```
