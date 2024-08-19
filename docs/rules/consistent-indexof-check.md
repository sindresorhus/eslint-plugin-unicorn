# Enforce consistent style when checking for element existence with `indexOf()`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce consistent style when checking for element existence with `indexOf()`.

Prefer using `index === -1` to check if an element does not exist and `index !== -1` to check if an element does exist.

Similar to the [`explicit-length-check`](explicit-length-check.md) rule.

## Examples

```js
// ❌
const index = foo.indexOf('bar');
if (index < 0) {}

// ✅
const index = foo.indexOf('bar');
if (index === -1) {}
```

```js
// ❌
const index = foo.indexOf('bar');
if (index >= 0) {}

// ✅
const index = foo.indexOf('bar');
if (index !== -1) {}
```

```js
// ❌
if (foo.indexOf('bar') >= 0) {}

// ✅
if (foo.indexOf('bar') !== -1) {}
```
