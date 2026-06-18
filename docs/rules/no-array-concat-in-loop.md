# no-array-concat-in-loop

📝 Disallow array accumulation with `Array#concat()` in loops.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`Array#concat()` creates a new array every time it is called. When an accumulator is reassigned with `.concat()` on every loop iteration, each iteration copies everything accumulated so far, which can make the loop quadratic in the total number of accumulated items.

Use `Array#push()` inside the loop when each chunk is an array, or collect the nested arrays and flatten them once outside the loop.

This rule intentionally only reports local `let` and `var` variables initialized to an empty array literal. It does not try to infer arbitrary array-like values or custom `.concat()` methods.

This rule does not provide an autofix. Replacing `.concat()` with `.push()` can change observable behavior when the old array is aliased, and `.concat()` has argument-spreading semantics that are not always equivalent to `push(...value)`.

## Examples

```js
// ❌
let result = [];

for (const chunk of chunks) {
	result = result.concat(chunk);
}
```

```js
// ✅
const result = [];

for (const chunk of chunks) {
	result.push(...chunk);
}
```

```js
// ✅
const result = chunks.flat();
```

```js
// ✅
let result = [];

for (const chunk of chunks) {
	result = other.concat(chunk);
}
```
