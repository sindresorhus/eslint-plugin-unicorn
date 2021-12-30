# Prefer using `.dataset` on DOM elements over calling attribute methods

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `.setAttribute(…)`, `.removeAttribute(…)` and `.hasAttribute(…)`.

## Fail

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
element.dataset.unicorn = '🦄';
```

```js
delete element.dataset.unicorn;
```

```js
const hasUnicorn = Object.hasOwn(element.dataset, 'unicorn');
```

```js
const hasUnicorn = Object.prototype.hasOwnProperty.call(element.dataset, 'unicorn');
```

```js
const hasUnicorn = element.dataset.hasOwnProperty('unicorn');
```

```js
const hasUnicorn = Reflect.has(element.dataset, 'unicorn');
```

```js
const hasUnicorn = 'unicorn' in element.dataset;
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
