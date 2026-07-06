# no-unnecessary-array-flat-map

📝 Disallow `Array#flatMap()` callbacks that only wrap a single item.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#flatMap()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) is useful when one input item can become multiple output items. When a callback only returns `[item]` or `condition ? [item] : []`, `.map()`, `.filter()`, or `.filter().map()` is clearer.

This rule currently checks simple arrow callbacks that return either a one-item array or `condition ? [item] : []`. More complex callback bodies are intentionally ignored.

In TypeScript files, conditional callbacks like `value ? [value] : []` are ignored because rewriting them to `.filter()` or `.filter().map()` can lose TypeScript control-flow narrowing and change the inferred type. Direct one-item callbacks like `value => [value.id]` are still reported.

## Examples

```js
// ❌
const ids = array.flatMap(value => [value.id]);

// ✅
const ids = array.map(value => value.id);
```

```js
// ❌
const ids = array.filter(value => value.active).flatMap(value => [value.id]);

// ✅
const ids = array.filter(value => value.active).map(value => value.id);
```

```js
// ❌
const active = array.flatMap(value => value.active ? [value] : []);

// ✅
const active = array.filter(value => value.active);
```

```js
// ❌
const ids = array.flatMap(value => value.active ? [value.id] : []);

// ✅
const ids = array.filter(value => value.active).map(value => value.id);
```

```js
// ✅
const descendants = array.flatMap(value => value.children);
```

```js
// ✅
const values = array.flatMap(value => [value, value * 2]);
```

## Related rules

- [unicorn/prefer-array-flat-map](./prefer-array-flat-map.md)
