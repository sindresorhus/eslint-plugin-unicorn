# no-manually-wrapped-comments

📝 Disallow manually wrapped comments.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports separated consecutive line comments that look like one manually wrapped unfinished sentence. End intentionally separate comments with sentence punctuation, `:`, or an emoji-like symbol.

This rule also supports JSONC and JSON5 line comments when linting with [`@eslint/json`](https://github.com/eslint/json).

Comments that are not prose are ignored and never merged:

- Tooling directives, for example `eslint-*`, `@ts-check`, `prettier-ignore`, `deno-lint-ignore`, `dprint-ignore`, `noinspection …`, `c8 ignore`, `cspell:disable`, and `spell-checker:`.
- All-caps annotations, for example `MARK:`, `TODO:`, `TODO(owner):`, `FIXME:`, and `NOTE:`.
- Machine-readable [SPDX](https://spdx.dev/learn/handling-license-info/) tags, for example `SPDX-License-Identifier`.
- Copyright headers, for example `© 2026 …` and `Copyright 2026 …`.
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
