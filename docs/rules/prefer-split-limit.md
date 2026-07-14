# prefer-split-limit

📝 Prefer `String#split()` with a limit.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you only need a prefix of the results from splitting a string, pass a [`limit`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#limit) to `String#split()`. This can improve performance by allowing the method to stop once enough parts have been produced, and it makes your intent clearer.

This rule checks two patterns with an obvious built-in separator: direct array destructuring in a variable declaration or standalone assignment expression, and direct access using a statically known non-negative integer index.

## Examples

```js
// ❌ - Splits entire string, then accesses index 0
const protocol = url.split(':')[0]; // Could be long URL

// ✅ - Splits into at most one part
const protocol = url.split(':', 1)[0]; // More efficient
```

```js
// ❌ - Gets second part from full split
const [, filename] = path.split('/');

// ✅ - Splits into at most two parts while preserving the destructuring
const [, filename] = path.split('/', 2);
```

```js
// ❌
const part = csvLine.split(',')[3];

// ✅ - Limit is higher than index to ensure element exists
const part = csvLine.split(',', 4)[3];
```

```js
// ✅ - Accessing negative index (needs full array)
const lastPart = string.split('/').at(-1);

// ✅ - Unknown separator or index
const parts = string.split(dynamicSeparator)[unknownIndex];

// ✅ - The rest element needs all remaining parts
const [firstPart, ...remainingParts] = string.split('/');
```

> [!NOTE]
> Performance benefits depend on the JavaScript engine. V8 doesn't optimize `limit` for string separators, so it may not help with short strings. The main benefit is clearer intent showing you only need specific parts.
