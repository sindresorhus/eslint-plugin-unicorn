# Prefer `.textContent` over `.innerText`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
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
