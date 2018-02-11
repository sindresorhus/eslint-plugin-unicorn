# Prefer `addEventListener` over `on`-functions

Enforces the using `addEventListener` over `on`-functions for HTML DOM Events, such as `onclick` and `onkeydown`. There are numerous advantages of using `addEventListener`, which is described [here](https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/35093997#35093997). Some of these advantages include registering unlimited event handlers and works in almost every browser.

`on`-functions can be converted easily to `addEventListener` using the `--fix` option.


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

## Pass

```js
foo.addEventListener('click', () => {});
```

```js
foo.onclick;
```

```js
foo.setCallBack = () => {console.log('foo')};
```
