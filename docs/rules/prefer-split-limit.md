# prefer-split-limit

📝 Prefer `String#split()` with a limit.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you only need a specific element from a split string, pass a [`limit`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#limit) to `String#split()`. This can improve performance by allowing the method to stop once enough parts have been produced, and makes your intent clearer - you're only interested in that specific part.

This rule only checks direct access with a statically known non-negative integer index and an obvious built-in separator.

## Examples

```js
// ❌ - Splits entire string, then accesses index 0
const protocol = url.split(':')[0]; // Could be long URL

// ✅ - Only splits into 1 part max
const protocol = url.split(':', 1)[0]; // More efficient
```

```js
// ❌ - Gets second part from full split
const [, filename] = path.split('/');

// ✅ - More explicit about only needing 2 parts
const filename = path.split('/', 2)[1];
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
```

> [!NOTE]
> Performance benefits depend on the JavaScript engine. V8 doesn't optimize `limit` for string separators, so it may not help with short strings. The main benefit is clearer intent showing you only need specific parts.
