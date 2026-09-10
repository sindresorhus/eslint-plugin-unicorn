# prefer-iterator-zip

📝 Prefer `Iterator.zip()` over parallel-array indexing.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `Iterator.zip()` when a loop uses an index only to read corresponding values from multiple arrays and explicitly stops at the shortest array.

## Examples

```js
// ❌
for (let index = 0; index < Math.min(names.length, scores.length); index++) {
	save(names[index], scores[index]);
}

// ✅
for (const [name, score] of Iterator.zip([names, scores])) {
	save(name, score);
}
```

`Iterator.zip()` yields corresponding values and defaults to `shortest` mode, stopping when any input ends. It accepts two or more inputs.

## Supported patterns

The rule checks block-bodied `for` loops with a `let` index initialized to `0`, incremented by one, and bounded by the shortest input using `Math.min()` or `&&`:

```js
index < Math.min(names.length, scores.length);
index < names.length && index < scores.length;
```

Comparisons may be reversed. The `Math.min()` result may be cached in the loop initializer or an immediately preceding `const` or `let` used only by the loop condition.

Each input must be a distinct identifier read only as `input[index]` in the body. Arrays and typed arrays are supported; unknown inputs are assumed to be one of those. Known strings and plain objects are ignored.

Single-input bounds, callbacks, property chains, optional indexing, offsets, mutations, other input or index uses, and captured references are ignored.

## Suggestions

Conversions are editor suggestions because they can change when values are read. `Iterator.zip()` reads each row before the body and initializes every iterator up front, while `&&` can skip later `.length` reads. Review suggestions when calls or aliases can mutate inputs. Custom iteration behavior and shadowed built-ins are unsupported.

Suggestions create unique element names and preserve the body and its declarations. If a replacement would remove or relocate a comment, the rule reports without a suggestion.

Check the [runtime support for `Iterator.zip()`](https://caniuse.com/mdn-javascript_builtins_iterator_zip).
