# require-spread-parentheses

📝 Require parentheses around complex spread arguments.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Parentheses make it easier to see which expression a spread applies to. For example, `...enabled && overrides` spreads the result of the entire `enabled && overrides` expression.

## Examples

```js
// ❌
const options = {...enabled && overrides};

// ✅
const options = {...(enabled && overrides)};
```

The rule checks the outermost expression in a spread, including JSX spread attributes and spreads in Vue templates (`vue-eslint-parser`). It covers binary, logical, conditional, assignment, and comma expressions, plus TypeScript type assertions and `satisfies`.

It also checks `await` and `yield`, except in JSX spread attributes, where Prettier and Oxfmt omit parentheses.

Autofix skips spreads with `@ts-expect-error` or `@ts-ignore` comments between `...` and the argument.

## Compatibility

Use `ignoredNodes` to allow parentheses around spread arguments with [`@stylistic/no-extra-parens`](https://eslint.style/rules/no-extra-parens).

```js
const rules = {
	'@stylistic/no-extra-parens': ['error', 'all', {ignoredNodes: ['SpreadElement']}],
};
```

Use the same option with [`vue/no-extra-parens`](https://eslint.vuejs.org/rules/no-extra-parens.html) when it uses Stylistic.
