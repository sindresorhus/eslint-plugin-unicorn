# Prevent calling `EventTarget#removeEventListener()` with the result of an expression

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*
<!-- RULE_NOTICE_END -->

The [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener) function must be called with a reference to the same function that was passed to [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener). Calling `removeEventListener` with an inline function or the result of an inline `.bind()` call is indicative of an error, and won't actually remove the listener.

## Fail

```js
window.removeEventListener('click', fn.bind(window));
```

```js
window.removeEventListener('click', () => {});
```

```js
window.removeEventListener('click', function () {});
```

```js
class MyElement extends HTMLElement {
	handler() {}

	disconnectedCallback() {
		this.removeEventListener('click', this.handler.bind(this));
	}
}
```

## Pass

```js
window.removeEventListener('click', listener);
```

```js
window.removeEventListener('click', getListener());
```

```js
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
