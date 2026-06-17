# no-array-splice

📝 Prefer `Array#toSpliced()` over `Array#splice()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer using [`Array#toSpliced()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSpliced) over [`Array#splice()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice) when the return value of `splice()` is unused.

`Array#splice()` modifies the original array and returns the removed elements, while `Array#toSpliced()` returns a changed copy and leaves the original array untouched.

This rule only reports unused `splice()` calls when the receiver is a `let` or `var` variable initialized with a fresh array the scope owns: an array literal, `Array()`/`new Array()`, `Array.from()`, `Array.of()`, or an array-returning method (`.filter()`, `.flat()`, `.flatMap()`, `.map()`, `.toReversed()`, `.toSorted()`, `.toSpliced()`, `.with()`). TypeScript wrappers like `array!` and `array as string[]` are supported.

It also skips arrays that _escape_ the scope (passed as an argument, aliased to another binding, returned, or stored in an array or object literal), since an outside reference could observe the in-place mutation.

This rule ignores `splice()` patterns that have simpler mutating alternatives covered by [`no-unnecessary-splice`](./no-unnecessary-splice.md), such as `array.splice(0, 1)` and `array.splice(array.length, 0, item)`.

When TypeScript type annotations or type information show that the receiver is not an array, or that assigning a plain array back could be type-invalid, this rule does not report it. This includes tuples, type aliases, generic type parameters, and readonly array types. Complex inferred TypeScript types require type information to be skipped reliably.

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
// ❌
let array = items.filter(isActive);
array.splice(1, 1);

// ✅
let array = items.filter(isActive);
array = array.toSpliced(1, 1);
```

```js
// ✅
const removed = array.splice(1, 1);
```

```js
// ✅ — array comes from elsewhere and may be shared, so it must be mutated in place
let structures = getStructures();
structures.splice(index, 1);
```

```js
// ✅ — array escapes, so an outside holder may rely on the in-place mutation
let array = [];
processItems(array);
array.splice(1, 1);
```
