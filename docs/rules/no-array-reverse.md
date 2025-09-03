# Prefer `Array#toReversed()` over `Array#reverse()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Array#toReversed()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toReversed) over [`Array#reverse()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse).

`Array#reverse()` modifies the original array, while `Array#toReversed()` returns a new reversed array.

## Examples

```js
// ❌
const reversed = array.reverse();

// ✅
const reversed = array.toReversed();
```

## Options

Type: `object`

### allowExpressionStatement

Type: `boolean`\
Default: `true`

This rule allows `array.reverse()` to be used as an expression statement by default.\
Pass `allowExpressionStatement: false` to forbid `Array#reverse()` even if it's an expression statement.

#### Fail

```js
// eslint unicorn/no-array-reverse: ["error", {"allowExpressionStatement": false}]
array.reverse();
```

## Related rules

- [unicorn/no-array-sort](./no-array-sort.md)
