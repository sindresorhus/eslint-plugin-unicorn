# Prefer `.textContent` over `.innerText`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

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
