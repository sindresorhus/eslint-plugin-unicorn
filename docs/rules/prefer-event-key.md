# Prefer `event.key` over `event.keyCode`

Enforces the use of `event.key` over `event.keyCode` for clarity.


## Fail

```js
foo.addEventListener('keydown', event => {
  if (event.keyCode === 27) {
  }
});

foo.addEventListener('keydown', event => {
  if (event.keyCode !== 27) {
  }
});
```


## Pass

```js
foo.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
  }
});
```
