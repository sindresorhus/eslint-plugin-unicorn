# Prefer `addEventListener` over `onevents`

Enforces the using `addEventListener` over `onevents` for HTML Dom Events, such as `onclick` and `onkeydown`. There are numerous advantages of using `addEventListener`, which is described [here](https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/35093997#35093997). Some of these advantages include registering unlimited event handlers and works in almost every browser.

`onevents` functions can be converted easily to `addEventListener` using the `--fix` option.


## Fail

```javascript
foo.onclick = () => {}
```

```javascript
foo.onkeydown = () => {}
```

```javascript
foo.bar.onclick = onClick
```

## Pass

```javascript
foo.addEventListener('click', () => {})
```

```javascript
foo.onclick
```

```javascript
foo.setCallBack = () => {console.log('foo')}
```
