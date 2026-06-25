# prefer-iterator-helpers

📝 Prefer iterator helpers over temporary arrays from iterators.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Prefer iterator helpers over temporary arrays created from known iterators.

Iterator helpers avoid materializing a full array before calling terminal methods like `.find()` or `.some()`. They can also preserve short-circuiting for methods that do not need to consume the whole iterator.

## Examples

```js
// ❌
[...map.values()].find(value => value.id === id);

// ✅
map.values().find(value => value.id === id);
```

```js
// ❌
Array.from(string.matchAll(pattern)).some(match => match[1]);

// ✅
string.matchAll(pattern).some(match => match[1]);
```

```js
// ❌
[...map.values()].reduce((total, value) => total + value, 0);

// ✅
map.values().reduce((total, value) => total + value, 0);
```

This rule is intentionally narrow. It only reports known iterator expressions, such as `.values()`, `.keys()`, `.entries()`, `.matchAll()`, static `Iterator` methods, lazy iterator helper chains, and values known to be iterators from TypeScript annotations or type information. It does not report arbitrary iterables because not every iterable has iterator helpers.

```js
// ✅
[...set].find(value => value.id === id);
```

Cases are reported without autofixes because `Array` callbacks receive an extra trailing `array` argument that `Iterator` callbacks do not. The rule ignores inline callbacks that can observe that argument. It offers suggestions when they can be applied safely. Suggestions also account for custom `.values()`, `.keys()`, and `.entries()` methods that may not return iterators with iterator helpers.

This rule does not report `.filter()`, `.map()`, or `.flatMap()` because their `Iterator` versions return iterators, not arrays.
