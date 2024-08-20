# Disallow nested ternary expressions with repeated alternatives

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow nested ternary expressions with repeated alternatives, and simplify to a more readable format with logical operators.

## Examples

```js
a ? b ? c : 1 : 1; // ❌
a && b ? c : 1; // ✅
```

```js
a ? b ? c : { foo } : { foo }; // ❌
a && b ? c : { foo }; // ✅
```

```js
a ? b ? c : sameReference : sameReference; // ❌
a && b ? c : sameReference; // ✅
```

```js
a ? b ? c : foo.bar() : foo.bar(); // ❌
a && b ? c : foo.bar(); // ✅
```
