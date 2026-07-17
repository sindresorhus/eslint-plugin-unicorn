# dom-node-dataset

📝 Enforce consistent style for DOM element dataset access.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `getAttribute(…)`, `.setAttribute(…)`, `.removeAttribute(…)` and `.hasAttribute(…)`.

The `dataset` API maps `data-*` attributes to properties, avoiding repeated attribute-name strings and keeping reads and writes consistent.

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

## Options

### preferAttributes

Type: `boolean`\
Default: `false`

When `true`, enforces the opposite direction: prefer `getAttribute(…)` / `setAttribute(…)` / `removeAttribute(…)` / `hasAttribute(…)` over named `.dataset` access — covering reads, writes, `delete`, simple destructuring, existence checks (`in`, `Object.hasOwn`, `.hasOwnProperty()`), and assigning `.dataset` to a variable (`const data = element.dataset`, which hides the attribute access from a search). Direct whole-object reads (`foo(element.dataset)`) and inherited members (`element.dataset.toString`) are not flagged. This can be useful for greppability when data attributes are also referenced in CSS/HTML.

```js
/* eslint unicorn/dom-node-dataset: ["error", {"preferAttributes": true}] */

// ❌
const unicorn = element.dataset.unicorn;

// ✅
const unicorn = element.getAttribute('data-unicorn');
```

```js
/* eslint unicorn/dom-node-dataset: ["error", {"preferAttributes": true}] */

// ❌
element.dataset.unicorn = '🦄';

// ✅
element.setAttribute('data-unicorn', '🦄');
```

```js
/* eslint unicorn/dom-node-dataset: ["error", {"preferAttributes": true}] */

// ❌
delete element.dataset.unicorn;

// ✅
element.removeAttribute('data-unicorn');
```

```js
/* eslint unicorn/dom-node-dataset: ["error", {"preferAttributes": true}] */

// ❌
'unicorn' in element.dataset;

// ✅
element.hasAttribute('data-unicorn');
```

```js
/* eslint unicorn/dom-node-dataset: ["error", {"preferAttributes": true}] */

// ❌
const data = element.dataset;
console.log(data.unicorn);

// ✅
console.log(element.getAttribute('data-unicorn'));
```
