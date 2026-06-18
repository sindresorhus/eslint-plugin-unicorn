# prefer-continue

📝 Prefer early continues over whole-loop conditional wrapping.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Avoid wrapping an entire loop body in a conditional. A `continue` guard often makes the main path clearer by skipping uninteresting iterations first.

This rule only reports when a block-bodied loop contains exactly one statement and that statement is an `if` statement without `else`. With the default `maximumStatements` option, it does not report nested `if` statements, loops that continue after the `if`, or non-block loop bodies.

## Examples

```js
// ❌
for (const item of items) {
	if (item.isActive) {
		process(item);
		save(item);
	}
}

// ✅
for (const item of items) {
	if (!item.isActive) {
		continue;
	}

	process(item);
	save(item);
}
```

```js
// ✅
for (const item of items) {
	if (item.isActive) {
		process(item);
	}
}
```

```js
// ✅
for (const item of items) {
	if (item.isActive) {
		process(item);
		save(item);
	}

	finish(item);
}
```

## Options

### maximumStatements

Type: `integer`\
Default: `1`

Maximum number of statements allowed in a whole-loop conditional wrapper.

With the default, a single-statement wrapper is allowed:

```js
for (const item of items) {
	if (item.isActive) {
		process(item);
	}
}
```

Set `maximumStatements` to `0` to report any non-empty whole-loop conditional wrapper:

```js
'unicorn/prefer-continue': [
	'error',
	{
		maximumStatements: 0,
	},
]
```

Autofix is conservative. It skips wrappers with comments outside the condition or moved body, trailing wrapper comments, moved lexical names that are used in the condition or already declared by the loop header, direct `eval(...)` with moved lexical declarations, direct function, class, TypeScript, `using`, or `await using` declarations, and multiline-sensitive strings, templates, or JSX. Multiline unbraced consequents are report-only.

## Related Rules

[`unicorn/prefer-early-return`](./prefer-early-return.md) applies the same guard-clause idea to functions.

[`unicorn/no-useless-continue`](./no-useless-continue.md) removes `continue` statements that do not change control flow. This rule creates a `continue` guard that skips the rest of the loop body, so the two rules are complementary.

ESLint's [`no-continue`](https://eslint.org/docs/latest/rules/no-continue) enforces the opposite style. Do not enable both rules together.
