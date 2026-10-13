# prefer-iterator-concat

📝 Prefer `Iterator.concat(…)` over temporary spread arrays.

🚫 Disabled by default.

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

`Iterator.concat()` evaluates all its arguments first and then consumes the iterables lazily. The conversion is autofixed when the array is passed to `new Map(…)`, `new WeakMap(…)`, `new Set(…)`, `new WeakSet(…)`, a `TypedArray` constructor, `Object.fromEntries(…)`, `Array.from(…)`, or `TypedArray.from(…)` without a mapper function, since these only store the values, and no argument after the first has a side effect. Otherwise, it is offered as a suggestion, because replacing the spread array can change argument evaluation, mutation, callback timing, and error handling.

A spread of a string is ignored. Spreading a string works, but `Iterator.concat()` throws for a string primitive.

```js
// ✅
const letters = new Set([...'abc', ...'xyz']);
```
