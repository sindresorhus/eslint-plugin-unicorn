# Prefer using `.dataset` on DOM elements over `.setAttribute(…)` and `.removeAttribute(…)`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `.setAttribute(…)` and `.removeAttribute(…)`.

## Fail

```js
element.setAttribute('data-unicorn', '🦄');
```

```js
element.removeAttribute('data-unicorn');
```

## Pass

```js
element.dataset.unicorn = '🦄';
```

```js
delete element.dataset.unicorn;
```

```js
element.setAttribute('not-dataset', '🦄');
```

```js
element.removeAttribute('not-dataset');
```
