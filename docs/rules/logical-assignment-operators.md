# logical-assignment-operators

📝 Require or disallow logical assignment operator shorthand.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is the same as the built-in ESLint [`logical-assignment-operators`](https://eslint.org/docs/latest/rules/logical-assignment-operators) rule, but when `enforceForIfStatements` is enabled, falsy `if` assignments are reported with suggestions for both `||=` and `??=` instead of being autofixed.

Consistently choosing logical-assignment shorthand or an explicit assignment or conditional makes updates easier to scan and avoids mixing the same pattern in different forms.

## Replacement for ESLint `logical-assignment-operators`

This rule replaces ESLint's built-in `logical-assignment-operators` rule, which Unicorn presets disable when this rule is enabled.

## Examples

```js
/* eslint unicorn/logical-assignment-operators: ["error", "always", {"enforceForIfStatements": true}] */

// ❌
if (!foo) {
	foo = bar;
}

// ✅
foo ||= bar;

// ✅
foo ??= bar;
```

## Options

This rule supports the same options as ESLint `logical-assignment-operators`.
