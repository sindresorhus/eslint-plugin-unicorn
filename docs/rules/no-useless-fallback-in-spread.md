# no-useless-fallback-in-spread

📝 Disallow useless fallback when spreading in object literals.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Spreading [falsy values](https://developer.mozilla.org/en-US/docs/Glossary/Falsy) in object literals won't add any unexpected properties, so it's unnecessary to add an empty object as fallback.

## Examples

```js
// ❌
const object = {...(foo || {})};

// ❌
const object = {...(foo ?? {})};

// ✅
const object = {...foo};
```

```js
// ✅
const object = {...(foo && {})};
```

```js
// ✅
const array = [...(foo || [])];
```

## Options

### `checkTernary`

Type: `boolean`\
Default: `true`

Whether to check ternary expressions where one branch is an empty object.

Unlike the `||`/`??` fallback, which is exactly equivalent to spreading the value directly, rewriting a ternary into a `&&` expression is a stylistic change. Set this to `false` to keep ternaries as-is while still flagging the `||`/`??` fallback.

```js
/* eslint unicorn/no-useless-fallback-in-spread: ["error", {checkTernary: false}] */

// ✅
const object = {...(foo ? {bar: true} : {})};

// ❌ Still flagged
const object = {...(foo || {})};
```
