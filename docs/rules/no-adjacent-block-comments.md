# no-adjacent-block-comments

📝 Disallow adjacent plain block comments that can be merged.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Merge consecutive standalone block comments at the same indentation when each has one line of content. Blank lines, code, and other comments break the group. This includes documentation comments, asterisk banners, license notices, and known tool directives.

Enable this rule where adjacent comments usually belong together. Merging can affect tools that rely on comment boundaries or count lines.

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

Regular expressions to ignore. Strings are interpreted as regular expressions. The rule tests each trimmed content line and the lines joined with `\n`.
