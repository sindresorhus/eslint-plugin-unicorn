# no-invalid-character-comparison

📝 Disallow comparing a single character from a string to a multi-character string.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Indexing a string returns a single character (or an empty string / `undefined` when out of bounds). Comparing such a result to a string literal longer than one character can therefore never be equal, so the comparison is always `false` (or always `true` for `!=`/`!==`).

This is most often a typo, such as writing `'/n'` instead of `'\n'`.

This rule checks the result of `String#charAt()`, `String#at()`, and bracket access (`string[index]`). It only reports when the receiver is provably a string, since user-defined methods and arrays can use the same syntax.

## Examples

```js
// ❌
'unicorn'.charAt(0) === 'ab';

// ✅
'unicorn'.charAt(0) === 'u';
```

```js
// ❌
'unicorn'.charAt(3) === '/n'; // Typo: meant '\n'

// ✅
'unicorn'.charAt(3) === '\n';
```

```js
// ❌
'unicorn'.at(0) === 'ab';
'unicorn'[0] === 'ab';

// ✅
'unicorn'.at(0) === 'a';
'unicorn'[0] === 'a';
```

Checking for an empty string is allowed, since indexing out of bounds is a legitimate use:

```js
// ✅
'unicorn'.charAt(100) === '';
```
