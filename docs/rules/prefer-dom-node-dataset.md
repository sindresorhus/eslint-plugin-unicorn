# Prefer using `.dataset` on DOM elements over calling attribute methods

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `getAttribute(…)`, `.setAttribute(…)`, `.removeAttribute(…)` and `.hasAttribute(…)`.

## Examples

```js
// ❌
const unicorn = element.getAttribute('data-unicorn');

// ✅
const {unicorn} = element.dataset;
```

```js
// ❌
element.setAttribute('data-unicorn', '🦄');

// ✅
element.dataset.unicorn = '🦄';
```

```js
// ❌
element.removeAttribute('data-unicorn');

// ✅
delete element.dataset.unicorn;
```

```js
// ❌
const hasUnicorn = element.hasAttribute('data-unicorn');

// ✅
const hasUnicorn = Object.hasOwn(element.dataset, 'unicorn');
```

```js
// ✅
const foo = element.getAttribute('foo');
```

```js
// ✅
element.setAttribute('not-dataset', '🦄');
```

```js
// ✅
element.removeAttribute('not-dataset');
```

```js
// ✅
const hasFoo = element.hasAttribute('foo');
```
