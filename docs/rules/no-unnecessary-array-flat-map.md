# no-unnecessary-array-flat-map

📝 Disallow unnecessary use of `Array#flatMap()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#flatMap()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) is useful when one input item can become multiple output items. When a callback only returns `[item]` or `condition ? [item] : []`, `.map()`, `.filter()`, or `.filter().map()` is clearer.

For method replacements, this rule checks simple arrow callbacks that return either a one-item array or `condition ? [item] : []`.

The rule also disallows unnecessary one-item array wrappers in inline callbacks, including conditional expressions and return statements in block bodies. When the item is known not to be an array, it can be returned directly while keeping `.flatMap()`. Non-array values are recognized from expression syntax, primitive TypeScript annotations, and type information when available. Unknown values, broad structural types, and callbacks with explicit return types are ignored for wrapper removal. Async callbacks, generator callbacks, and referenced callbacks are also ignored.

In TypeScript files, including Vue SFC `<script>` blocks with `lang="ts"` or `lang="tsx"`, conditional callbacks like `value ? [value] : []` are not rewritten to `.filter()` or `.filter().map()` because that can lose TypeScript control-flow narrowing and change the inferred type. Safe wrapper removal keeps the callback intact and preserves this narrowing. Direct one-item callbacks like `value => [value.id]` are still reported.

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

```js
// ❌
const values = array.flatMap(() => Math.random() ? [1] : [2, 3]);

// ✅
const values = array.flatMap(() => Math.random() ? 1 : [2, 3]);
```

```ts
declare const value: string;

// ❌
const values = array.flatMap(function () {
	if (condition) {
		return [value];
	}

	return ['other', 'values'];
});

// ✅
const values = array.flatMap(function () {
	if (condition) {
		return value;
	}

	return ['other', 'values'];
});
```

## Related rules

- [unicorn/prefer-array-flat-map](./prefer-array-flat-map.md)
