# Prefer `.textContent` over `.innerText`

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

Enforces the use of `.textContent` over `.innerText` for DOM nodes.

There are [some advantages of using `.textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent), like performance and more predictable behavior when updating it.

Note that there are [differences](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent#differences_from_innertext) between them.

## Fail

```js
const text = foo.innerText;
```

```js
const {innerText} = foo;
```

```js
foo.innerText = '🦄';
```

## Pass

```js
const text = foo.textContent;
```

```js
const {textContent} = foo;
```

```js
foo.textContent = '🦄';
```
