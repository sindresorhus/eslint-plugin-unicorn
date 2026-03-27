# better-regex

📝 Improve regexes by making them shorter, consistent, and safer.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Note: This rule uses [`regexp-tree`](https://github.com/DmitrySoshnikov/regexp-tree) and [`clean-regexp`](https://github.com/samverschueren/clean-regexp) under the hood.

## Examples

```js
// ❌
const regex = /[0-9]/;

// ✅
const regex = /\d/;
```

```js
// ❌
const regex = /[^0-9]/;

// ✅
const regex = /\D/;
```

```js
// ❌
const regex = /[a-zA-Z0-9_]/;

// ✅
const regex = /\w/;
```

```js
// ❌
const regex = /[a-z0-9_]/i;

// ✅
const regex = /\w/i;
```

```js
// ❌
const regex = /[^a-zA-Z0-9_]/;

// ✅
const regex = /\W/;
```

```js
// ❌
const regex = /[^a-z0-9_]/i;

// ✅
const regex = /\W/i;
```

```js
// ❌
const regex = /[0-9]\.[a-zA-Z0-9_]\-[^0-9]/i;

// ✅
const regex = /\d\.\w-\D/i;
```

## Options

### sortCharacterClasses

Type: `boolean`\
Default: `true`

Disables optimizations that affect the sorting of character classes. For example, preserves the order of the characters in `[AaQqTt]` rather than sorting it to `[AQTaqt]`.
