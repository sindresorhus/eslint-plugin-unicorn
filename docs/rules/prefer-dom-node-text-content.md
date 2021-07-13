# Prefer `.textContent` over `.innerText`

Enforces the use of `.textContent` over `.innerText` for DOM nodes.

There are [some advantages of using `.textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent), like performance and more predictable behavior when updating it.

Note that there are [differences](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext) between them.

## Fail

```js
const text = foo.innerText;
```

```js
foo.innerText = '🦄';
```

## Pass

```js
const text = foo.textContent;
```

```js
foo.textContent = '🦄';
```
