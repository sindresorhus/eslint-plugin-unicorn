# Prefer using `.dataset` on DOM elements over calling attribute methods

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `getAttribute(…)`, `.setAttribute(…)`, `.removeAttribute(…)` and `.hasAttribute(…)`.

## Fail

```js
const unicorn = element.getAttribute('data-unicorn');
```

```js
element.setAttribute('data-unicorn', '🦄');
```

```js
element.removeAttribute('data-unicorn');
```

```js
const hasUnicorn = element.hasAttribute('data-unicorn');
```

## Pass

```js
const {unicorn} = element.dataset;
```

```js
element.dataset.unicorn = '🦄';
```

```js
delete element.dataset.unicorn;
```

```js
const hasUnicorn = Object.hasOwn(element.dataset, 'unicorn');
```

```js
const foo = element.getAttribute('foo');
```

```js
element.setAttribute('not-dataset', '🦄');
```

```js
element.removeAttribute('not-dataset');
```

```js
const hasFoo = element.hasAttribute('foo');
```
