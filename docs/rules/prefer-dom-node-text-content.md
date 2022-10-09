# Prefer `.textContent` over `.innerText`

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
