# Improve regexes by making them shorter, consistent, and safer

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

Note: This rule uses [`regexp-tree`](https://github.com/DmitrySoshnikov/regexp-tree) and [`clean-regexp`](https://github.com/samverschueren/clean-regexp) under the hood.

## Fail

```js
const regex = /[0-9]/;
const regex = /[^0-9]/;
const regex = /[a-zA-Z0-9_]/;
const regex = /[a-z0-9_]/i;
const regex = /[^a-zA-Z0-9_]/;
const regex = /[^a-z0-9_]/i;
const regex = /[0-9]\.[a-zA-Z0-9_]\-[^0-9]/i;
```

## Pass

```js
const regex = /\d/;
const regex = /\D/;
const regex = /\w/;
const regex = /\w/i;
const regex = /\W/;
const regex = /\W/i;
const regex = /\d\.\w\-\D/i;
```

## Options

### sortCharacterClasses

Type: `boolean`\
Default: `true`

Disables optimizations that affect the sorting of character classes. For example, preserves the order of the characters in `[AaQqTt]` rather than sorting it to `[AQTaqt]`.
