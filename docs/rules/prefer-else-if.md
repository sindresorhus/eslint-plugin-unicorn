# prefer-else-if

📝 Prefer `else if` over adjacent `if` statements with related conditions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `else if` when adjacent `if` statements compare the same identifier or static member expression against mutually exclusive static values. This makes the control flow explicit and avoids evaluating later conditions after an earlier match.

This rule reports adjacent sibling `if` statements with strict equality checks. It also understands shorthand boolean tests like `if (foo)`, `if (!foo)`, and `if (Boolean(foo))` when the checked value is known to be boolean from syntax, TypeScript annotations, static values, or type information. It skips branches that exit, since [`no-useless-else`](./no-useless-else.md) intentionally prefers the flat form there.

This rule only autofixes plain identifier checks when the previous branch and later condition have no side effects. Other reported cases may offer a suggestion, since adding `else` can change behavior if state changes between checks or a later condition has observable effects.

## Examples

```js
// ❌
if (foo === 1) {
	one();
}

if (foo === 2) {
	two();
}

// ✅
if (foo === 1) {
	one();
} else if (foo === 2) {
	two();
}
```

## Related rules

- [`prefer-switch`](./prefer-switch.md) handles existing `if`/`else if` chains with enough cases and can then prefer `switch`.
- [`no-lonely-if`](./no-lonely-if.md) handles nested `else { if (...) }`, not adjacent sibling `if` statements.
- [`no-useless-else`](./no-useless-else.md) removes `else` after exiting branches; this rule skips those cases.
