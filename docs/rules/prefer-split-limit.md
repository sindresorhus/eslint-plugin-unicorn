# prefer-split-limit

📝 Prefer `String#split()` with a limit.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer passing a [`limit`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#limit) to `String#split()` when only one known element is read from the result.

The limit lets `String#split()` stop once enough entries have been produced.

This rule only checks direct access with a statically known non-negative integer index and an obvious built-in separator.

## Examples

```js
// ❌
const part = string.split('/')[1];

// ✅
const part = string.split('/', 2)[1];
```

```js
// ❌
const part = string.split('/').at(1);

// ✅
const part = string.split('/', 2).at(1);
```

```js
// ✅
const part = string.split('/').at(-1);

// ✅
const part = string.split(separator)[1];
```

> [!NOTE]
> Whether this is faster depends on the JavaScript engine. V8 currently does not optimize the `limit` for string separators, so it may not help (and can slightly hurt) for short strings. The main benefit is clearer intent.
