# single-line-block-comment-style

📝 Enforce a consistent style for single-line block comments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces a consistent layout for standalone block comments whose content occupies one line. It supports both ordinary block comments and documentation comments.

Comments with multiple content lines, block comments placed beside code, and directive comments are ignored. License comments beginning with `/*!` are also ignored.

## Examples

```js
/** Get the value. */
```

## Options

### `multiline`

The default option requires the comment delimiters to be on separate lines:

```js
/**
Get the value.
*/
```

### `single-line`

Requires the comment to fit on one line:

```js
/** Get the value. */
```

The opening delimiter is preserved, so `/*` comments remain `/*` comments and `/**` comments remain `/**` comments.
