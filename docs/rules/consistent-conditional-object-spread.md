# consistent-conditional-object-spread

📝 Enforce consistent conditional object spread style.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When conditionally spreading properties into an object literal, pick one style consistently.

By default, this rule prefers `&&` because it avoids an unnecessary empty object branch.

## Examples

```js
// ❌
const object = {...(condition ? {property} : {})};

// ✅
const object = {...(condition && {property})};
```

With the `'ternary'` option:

```js
// eslint unicorn/consistent-conditional-object-spread: ["error", "ternary"]

// ❌
const object = {...(condition && {property})};

// ✅
const object = {...(condition ? {property} : {})};
```

## Options

Type: `string`\
Default: `'logical'`

Available options:

- `'logical'` - Prefer `...(condition && object)`.
- `'ternary'` - Prefer `...(condition ? object : {})`.
