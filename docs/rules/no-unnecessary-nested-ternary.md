# no-unnecessary-nested-ternary

📝 Disallow unnecessary nested ternary expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Nested ternary expressions are unnecessary when two branches use the same expression and the conditions can be combined with a logical operator.

## Examples

```js
// ❌
a ? (b ? c : d) : d;

// ✅
a && b ? c : d;
```

```js
// ❌
a ? d : (b ? d : c);

// ✅
a || b ? d : c;
```

```js
// ✅
a ? (b ? c : d) : e;
```
