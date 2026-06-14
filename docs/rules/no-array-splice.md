# no-array-splice

📝 Prefer `Array#toSpliced()` over `Array#splice()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Array#toSpliced()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced) over [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice) when the return value of `splice()` is unused.

`Array#splice()` modifies the original array and returns the removed elements, while `Array#toSpliced()` returns a changed copy and leaves the original array untouched.

This rule only reports unused `splice()` calls on simple reassignable local identifiers, such as `let` variables, `var` variables, function parameters, and catch parameters. TypeScript wrappers around such identifiers, like `array!` and `array as string[]`, are also supported.

This rule ignores `splice()` patterns that have simpler mutating alternatives covered by [`no-unnecessary-splice`](./no-unnecessary-splice.md), such as `array.splice(0, 1)` and `array.splice(array.length, 0, item)`.

When TypeScript type annotations or type information show that the receiver is not an array, this rule does not report it.

This rule is suggestion-only because assigning the `Array#toSpliced()` result changes alias behavior. Code that still references the original array object will observe different behavior after reassignment.

## Examples

```js
// ❌
let array = [1, 2, 3];
array.splice(1, 1);

// ✅
array = array.toSpliced(1, 1);
```

```js
// ✅
const removed = array.splice(1, 1);
```
