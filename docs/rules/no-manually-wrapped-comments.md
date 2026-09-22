# no-manually-wrapped-comments

📝 Disallow manually wrapped comments.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports separated consecutive line comments, and consecutive lines inside a block comment, that look like one manually wrapped unfinished sentence. End intentionally separate comments with sentence punctuation, `:`, or an emoji-like symbol, or separate paragraphs inside a block comment with a blank line.

This rule also supports CSS comments when linting with [`@eslint/css`](https://github.com/eslint/css), JSONC and JSON5 comments when linting with [`@eslint/json`](https://github.com/eslint/json), YAML `#` comments when linting with [`eslint-plugin-yml`](https://github.com/ota-meshi/eslint-plugin-yml), and TOML `#` comments when linting with [`eslint-plugin-toml`](https://github.com/ota-meshi/eslint-plugin-toml).

Comments that are not prose are ignored and never merged:

- Tooling directives, for example `eslint-*`, `@ts-check`, `prettier-ignore`, `deno-lint-ignore`, `dprint-ignore`, `noinspection …`, `c8 ignore`, `cspell:disable`, and `spell-checker:`.
- All-caps annotations, for example `MARK:`, `TODO:`, `TODO(owner):`, `FIXME:`, and `NOTE:`.
- Machine-readable [SPDX](https://spdx.dev/learn/handling-license-info/) tags, for example `SPDX-License-Identifier`.
- Copyright headers, for example `© 2026 …` and `Copyright 2026 …`. A block comment that contains a copyright, SPDX, or `@license` line is treated as a license header and ignored entirely.
- Editor hints, for example `vim: …`, `-*- … -*-`, `language=HTML`, `region`, and `<editor-fold …>`.
- List items, separators, URLs, and comments containing code characters.

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

```js
// ❌
/**
 * This is a long comment but
 * I don't like long lines
 */

// ✅
/**
 * This is a long comment but I don't like long lines
 */
```

```js
// ✅
/**
 * This is a long comment.
 *
 * I don't like long lines
 */
```

```css
/* ❌ */
/* This is a long comment but
   I don't like long lines */

/* ✅ */
/* This is a long comment but I don't like long lines */
```

Code samples and ASCII diagrams inside block comments that contain no code characters are not distinguished from prose and may be reported.
