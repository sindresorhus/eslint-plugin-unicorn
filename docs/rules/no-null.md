# Disallow the use of the `null` literal

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow the use of the `null` literal, to encourage using `undefined` instead. You can learn why in <https://github.com/sindresorhus/meta/discussions/7>

## Examples

```js
// ❌
let foo = null;

// ✅
let foo;
```

```js
// ❌
if (bar == null) {}

// ✅
if (bar == undefined) {}
```

```js
// ✅
const foo = Object.create(null);
```

```js
// ✅
if (foo === null) {}
```

## Options

Type: `object`

### checkStrictEquality

Type: `boolean`\
Default: `false`

Strict equality(`===`) and strict inequality(`!==`) is ignored by default.

```js
// eslint unicorn/no-null: ["error", {"checkStrictEquality": true}]
// ❌
if (foo === null) {}
```

## Why

- [“Intent to stop using `null` in my JS code”](https://github.com/sindresorhus/meta/issues/7).
- [TypeScript coding guidelines](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines#null-and-undefined).
- [ESLint rule proposal](https://github.com/eslint/eslint/issues/6701).
- [Douglas Crockford](https://www.youtube.com/watch?v=PSGEjv3Tqo0&t=9m21s) on bottom values in JavaScript.
