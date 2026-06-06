# no-manually-wrapped-comments

📝 Disallow manually wrapped comments.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports separated consecutive line comments that look like one manually wrapped unfinished sentence. End each intentionally separate comment with sentence punctuation.

## Examples

```js
// ❌
// This is a long comment but
// I don't like long lines

// ✅
// This is a long comment but I don't like long lines
```

```js
// ✅
// This is a long comment.
// I don't like long lines.
```
