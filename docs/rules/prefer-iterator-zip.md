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

`Iterator.zip()` yields an array of corresponding values on each iteration. Its default `shortest` mode stops when any input ends, matching the `Math.min()` bound. It also supports more than two inputs.

## Supported patterns

This rule checks block-bodied `for` loops with one `let` index initialized to `0`, a direct `Math.min()` bound over distinct identifiers' `.length` properties, and an increment of `index++`, `++index`, or `index += 1`. The reversed comparison, `Math.min(…) > index`, is also supported.

Every input must be indexed in the body, and the index must only be used to read those inputs at that exact position. Direct mutations, other uses of the input arrays, and references captured inside nested functions or classes are ignored. Cached bounds, property-chain inputs, optional indexing, and offset indexing are not supported.

The rule recognizes arrays and typed arrays and also checks unknown inputs, such as untyped function parameters. Known unsuitable inputs, including strings and plain objects, are ignored. Unknown inputs are assumed to be ordinary arrays or typed arrays.

Loops bounded by one array and callbacks such as `.map()` are intentionally ignored because their behavior differs when input lengths are unequal.

```js
// ✅
names.map((name, index) => scores[index]);

// ✅
for (let index = 0; index < names.length; index++) {
	save(names[index], scores[index]);
}
```

## Suggestions

Conversions are offered as editor suggestions instead of automatic fixes. Zipping reads each row's values before entering the loop body, so applying a suggestion can change when values are read. Review suggestions if called functions or aliases can mutate the inputs. Custom iteration behavior and shadowed built-ins are unsupported.

The suggestion creates unique element names and preserves the body and existing local declarations. If a replacement would remove or relocate a comment, the rule reports without a suggestion.

## When not to use it

Use this rule only when your target environments provide [`Iterator.zip()`](https://tc39.es/proposal-joint-iteration/) or an appropriate polyfill. The plugin's minimum supported Node.js version does not guarantee that this API is available in linted applications.

Disable this rule if your project intentionally enables [`es-x/no-iterator-zip`](https://github.com/eslint-community/eslint-plugin-es-x/blob/master/docs/rules/no-iterator-zip.md) to prohibit the API for compatibility.
