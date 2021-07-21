# Prevent calling `EventTarget#removeEventListener()` with the result of an expression

The [removeEventListener] function must be called with a reference to the same function that was passed to [addEventListener]. Calling `removeEventListener` with an inline function or the result of an inline `.bind()` call is indicative of an error, and won't actually remove the listener.

[removeeventlistener]: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
[addeventlistener]: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener

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
