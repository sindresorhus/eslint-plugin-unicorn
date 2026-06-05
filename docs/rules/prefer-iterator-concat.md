# prefer-iterator-concat

📝 Prefer `Iterator.concat(…)` over temporary spread arrays.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer `Iterator.concat(…)` over temporary spread arrays.

`Iterator.concat()` creates one iterator from multiple iterables. In places that accept an iterable, this avoids materializing a temporary array.

## Examples

```js
// ❌
const set = new Set([...foo, ...bar]);

// ✅
const set = new Set(Iterator.concat(foo, bar));
```

```js
// ❌
for (const item of [...foo, ...bar]);

// ✅
for (const item of Iterator.concat(foo, bar));
```

This rule only reports temporary arrays made entirely from spreads. Mixed arrays are intentionally ignored.

```js
// ✅
new Set([first, ...rest]);
```

`Array.from(…)` and typed array `.from(…)` cases with mapper functions are reported as suggestions instead of autofixes because replacing the array literal can change when the mapper function runs.

`Promise.{all,allSettled,any,race}(…)` cases are also reported as suggestions instead of autofixes because replacing the array literal can change a synchronous throw during array creation into an asynchronous rejection.
