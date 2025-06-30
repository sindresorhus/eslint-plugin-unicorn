# Disallows using `Array.fill()` or `Array.from().fill()` with **reference types** to prevent unintended shared references across array elements

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallows using `Array.fill()` or `Array.from().fill()` with **reference types** (objects, arrays, functions, Maps, Sets, RegExp literals, etc.) to prevent unintended shared references across array elements. Encourages `Array.from()` or explicit iteration for creating independent instances.

**Reason**:
`Array(len).fill(value)` fills all elements with the **same reference** if `value` is non-primitive (e.g., `fill([])`), leading to bugs when one element’s mutations affect others.

**Key Features**:

- Catches **all reference types**: Objects, Arrays, Functions, `new` expressions, RegExp literals, and variables referencing them.
- **Clear error messages**: Identifies the reference type (e.g., `Object`, `RegExp`, `variable (name)`).

**Note**: Primitive types (`number`, `string`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) are always allowed.

## Examples

```js
// ❌ Object
new Array(3).fill({});
Array(3).fill({});
Array.from({ length: 3 }).fill({});

// ✅
Array.from({ length: 3 }, () => ({}));
```

```js
// ❌ Array
new Array(3).fill([]);
Array(3).fill([]);
Array.from({ length: 3 }).fill([]);

// ✅
Array.from({ length: 3 }, () => []);
```

```js
// ❌ Map
new Array(3).fill(new Map());
Array(3).fill(new Map());
Array.from({ length: 3 }).fill(new Map());

// ✅
Array.from({ length: 3 }, () => new Map());
```

```js
// ❌ Date
new Array(3).fill(new Date());
Array(3).fill(new Date());
Array.from({ length: 3 }).fill(new Date());

// ✅
Array.from({ length: 3 }, () => new Date());
```

```js
// ❌ Class
class BarClass {};
new Array(3).fill(new BarClass());
Array(3).fill(new BarClass());
Array.from({ length: 3 }).fill(new BarClass());

// ✅
Array.from({ length: 3 }, () => new BarClass());
```

```js
// ❌ Function
new Array(3).fill(function () {})
Array(3).fill(function () {})
Array.from({ length: 3 }).fill(function () {});

// ✅
Array.from({ length: 3 }, () => function () {});
```

```js
// ❌ RegExp literal
new Array(3).fill(/pattern/);
Array(3).fill(/pattern/);
Array.from({ length: 3 }).fill(/pattern/);

// ✅
Array.from({ length: 3 }, () => /pattern/);
```

```js
const box = []

// ❌ Shared reference
new Array(3).fill(box);
Array(3).fill(box);
Array.from({ length: 3 }).fill(box);

// ✅
Array.from({ length: 3 }, () => []);
```

## Options

### allowFunctions

Type: `boolean`\
Default: `true`

Should check function when filling an array?

This would pass by default:

```js
new Array(3).fill(function () {})
```

```js
"unicorn/catch-error-name": [
	"error",
	{
		"allowFunctions": false
	}
]
```

with `allowFunctions: false`, this would fail:

```js
new Array(3).fill(function () {})
```

### allowRegularExpressions

Type: `boolean`\
Default: `true`

Should check function when filling an array?

This would pass by default:

```js
new Array(3).fill(/pattern/)
```

```js
"unicorn/catch-error-name": [
	"error",
	{
		"allowRegularExpressions": false
	}
]
```

with `allowRegularExpressions: false`, this would fail:

```js
new Array(3).fill(/pattern/)
```
