# no-adjacent-block-comments

📝 Disallow adjacent plain block comments that can be merged.

💼🚫 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, 🎨 `recommended-css`, 🧩 `recommended-json`, 💎 `recommended-soml`. This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Merge adjacent standalone block comments with one content line each and matching indentation. Blank lines, code, and other comments (including documentation comments, asterisk banners, and recognized license notices and tool directives) break the group.

Merging can affect tools that rely on comment boundaries or line counts.

## Examples

```js
// ❌
/* Try the local cache first. */
/* Fall back to the server on a cache miss. */

// ✅
/*
Try the local cache first.
Fall back to the server on a cache miss.
*/
```

## Options

### `ignore`

Type: `Array<string | RegExp>`\
Default: `[]`

Tests each trimmed content line and the lines joined with `\n`. Strings are interpreted as regular expressions.
