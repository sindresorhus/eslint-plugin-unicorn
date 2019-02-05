# Prefer `addEventListener` and `removeEventListener` over `on`-functions

Enforces the use of `addEventListener` and `removeEventListener` over their `on` counterparts. For example, `foo.addEventListener('click', handler);` is preferred over `foo.onclick = handler;` for HTML DOM Events. There are [numerous advantages of using `addEventListener`](https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/35093997#35093997). Some of these advantages include registering unlimited event handlers and optionally having the event handler invoked only once.

This rule is fixable (only for `addEventListener`).


## Fail

```js
foo.onclick = () => {};
```

```js
foo.onkeydown = () => {};
```

```js
foo.bar.onclick = onClick;
```

```js
foo.onclick = null;
```

## Pass

```js
foo.addEventListener('click', () => {});
```

```js
foo.addEventListener('keydown', () => {});
```

```js
foo.bar.addEventListener('click', onClick);
```

```js
foo.removeEventListener('click', onClick);
```
