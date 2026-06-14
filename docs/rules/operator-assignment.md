# operator-assignment

📝 Require assignment operator shorthand where possible.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is the same as the built-in ESLint [`operator-assignment`](https://eslint.org/docs/latest/rules/operator-assignment) rule, but it also suggests compound assignment when a template literal starts by interpolating the assigned identifier.

The template literal case is suggestion-only because the change can affect coercion and side-effect ordering for unusual values.

## Examples

```js
// ❌
foo = foo + bar;

// ✅
foo += bar;
```

```js
// ❌
foo = `${foo} bar`;

// ✅
foo += ` bar`;
```

## Options

This rule supports the same options as ESLint `operator-assignment`.

### `always`

Require assignment operator shorthand where possible. This is the default.

### `never`

Disallow assignment operator shorthand.
