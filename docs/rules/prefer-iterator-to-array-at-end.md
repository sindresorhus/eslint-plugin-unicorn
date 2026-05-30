# prefer-iterator-to-array-at-end

📝 Enforce calling `.toArray()` at the end of an iterator method chain.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Iterator helpers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator#iterator_helpers) like `.filter()` and `.map()` are lazy — they process elements on demand without creating intermediate arrays. Calling [`.toArray()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator/toArray) early forces eager evaluation and allocates a temporary array before applying the chain method. Moving `.toArray()` to the end of the chain keeps evaluation lazy for as long as possible.

This rule is fixable when the callback is an inline arrow function that does not use `Array`'s extra callback argument.
Callback references and function expressions are reported without an autofix because the rule cannot determine whether they depend on `this`, `arguments`, or the extra callback argument.

## Examples

```js
// ❌
const result = iterator.toArray().filter(value => value.active);

// ✅
const result = iterator.filter(value => value.active).toArray();
```

```js
// ❌
const result = iterator.toArray().map(value => value.id);

// ✅
const result = iterator.map(value => value.id).toArray();
```

## Related rules

- [unicorn/no-useless-iterator-to-array](./no-useless-iterator-to-array.md)
