# prefer-continue

📝 Prefer early continues over conditionals wrapping the remainder of the loop body.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Avoid wrapping the rest of a loop body in a conditional. A `continue` guard often makes the main path clearer by skipping uninteresting iterations first.

By default, this rule reports when the last statement of a block-bodied loop is an `if` statement without `else`, even when other statements precede it. With the default `maximumStatements` option, it does not report nested `if` statements, loops that continue after the `if`, or non-block loop bodies.

It also does not report when the `if` body unconditionally exits the iteration (its last statement is `return`, `break`, `continue`, or `throw`), since an early `continue` would not flatten anything.

## Examples

```js
// ❌
for (const item of items) {
	doSomethingBefore();
	if (item.isActive) {
		process(item);
		save(item);
	}
}

// ✅
for (const item of items) {
	doSomethingBefore();
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

```js
// ✅
function findActive(items) {
	for (const item of items) {
		if (item.isActive) {
			process(item);
			return item;
		}
	}
}
```

## Options

### maximumStatements

Type: `integer`\
Default: `1`

Maximum number of statements allowed in a conditional wrapper at the end of a loop body.

With the default, a single-statement wrapper is allowed:

```js
for (const item of items) {
	if (item.isActive) {
		process(item);
	}
}
```

Set `maximumStatements` to `0` to report any non-empty conditional wrapper at the end of a loop body:

```js
'unicorn/prefer-continue': [
	'error',
	{
		maximumStatements: 0,
	},
]
```

Autofix is conservative. When statements precede the final `if`, direct `let` or `const` declarations in its body prevent automatic fixes. It skips wrappers with comments outside the condition or moved body, trailing wrapper comments, moved lexical names that are used in the condition, direct `eval(...)` with moved lexical declarations, direct function, class, TypeScript, `using`, or `await using` declarations, and multiline-sensitive strings, templates, or JSX. Multiline unbraced consequents are report-only.

### checkShortBodies

Type: `boolean`\
Default: `false`

When enabled, the rule prefers conditional wrapping for one to `maximumStatements` direct, non-empty statements after the guard or in its `else` branch. `maximumStatements: 0` disables this check; existing larger-body behavior is unchanged.

```js
'unicorn/prefer-continue': [
	'error',
	{
		checkShortBodies: true,
	},
]
```

```js
// ❌
for (const item of items) {
	if (!condition) {
		continue;
	}

	doSomething();
}

// ❌
for (const item of items) {
	if (!condition) {
		continue;
	} else {
		doSomething();
	}
}

// ✅
for (const item of items) {
	if (condition) {
		doSomething();
	}
}
```

The guard must come first and contain only an unlabeled `continue;`. An `if` with `else` must be the entire loop body. Guards after other statements, `else if` chains, and guards with extra work are ignored.

Autofix preserves an existing `else` block's scope. Direct declarations that would change scope, comments in or after the rewritten range, and multiline-sensitive tokens requiring reindentation make the violation report-only.

## Related Rules

[`unicorn/prefer-early-return`](./prefer-early-return.md) applies the same guard-clause idea to functions.

[`unicorn/no-useless-continue`](./no-useless-continue.md) removes `continue` statements that do not change control flow. This rule creates a `continue` guard that skips the rest of the loop body, so the two rules are complementary.

ESLint's [`no-continue`](https://eslint.org/docs/latest/rules/no-continue) enforces the opposite style. Do not enable both rules together.
