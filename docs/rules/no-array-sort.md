# Prefer `Array#toSorted()` over `Array#sort()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Array#toSorted()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted) over [`Array#sort()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort).

`Array#sort()` modifies the original array, while `Array#toSorted()` returns a new reversed array.

## Examples

```js
// ❌
const sorted = [...array].sort();

// ✅
const sorted = [...array].toSorted();
```

```js
// ❌
const sorted = [...array].sort((a, b) => a - b);

// ✅
const sorted = [...array].toSorted((a, b) => a - b);
```

## Options

Type: `object`

### allowExpressionStatement

Type: `boolean`\
Default: `true`

This rule allows `array.sort()` to be used as an expression statement by default.\
Pass `allowExpressionStatement: false` to forbid `Array#sort()` even if it's an expression statement.

#### Fail

```js
// eslint unicorn/no-array-sort: ["error", {"allowExpressionStatement": true}]
array.sort();
```

## Related rules

- [unicorn/no-array-reverse](./no-array-reverse.md)
