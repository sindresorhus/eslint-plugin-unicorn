# prefer-combined-guards

📝 Prefer combining consecutive guards with identical exit statements.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Consecutive guard clauses with identical exits can be combined using `||`, removing duplication while preserving condition evaluation order.

This rule checks adjacent `if` statements without `else`. Each body, with or without braces, must consist of one `return`, `throw`, `break`, `continue`, or direct call to the global `process.exit()` function. Both exits must have the same kind, and their values, labels, or `process.exit()` calls must match.

Exit values, labels, and calls are compared by source text, ignoring surrounding parentheses where applicable. The rule does not normalize internal formatting or infer semantic equivalence. Braces, surrounding whitespace, and optional trailing semicolons may differ.

To preserve TypeScript control-flow narrowing, the rule ignores non-literal `return` and `throw` values and non-literal `process.exit()` arguments in TypeScript. It also ignores exits containing tagged templates because each source location has its own cached template object.

Comments inside or between guards prevent autofixing.

## Examples

```js
// ❌
function check(context) {
	if (context.finished) {
		return;
	}

	if (!context.hasResult && !context.hasError) {
		return;
	}
}

// ✅
function check(context) {
	if (context.finished || (!context.hasResult && !context.hasError)) {
		return;
	}
}
```

```js
// ❌
if (value < 0) {
	throw invalidValue;
}

if (!Number.isFinite(value)) {
	throw invalidValue;
}

// ✅
if ((value < 0) || !Number.isFinite(value)) {
	throw invalidValue;
}
```

```js
// ❌
for (const item of items) {
	if (item.hidden) {
		continue;
	}

	if (item.disabled) {
		continue;
	}

	processItem(item);
}

// ✅
for (const item of items) {
	if (item.hidden || item.disabled) {
		continue;
	}

	processItem(item);
}
```

Bodies with additional statements or nested control flow are intentionally ignored. Arbitrary identical bodies cannot generally be combined: both original bodies could execute when both conditions are true.

```js
// ✅
if (firstCondition) {
	count++;
}

if (secondCondition) {
	count++;
}
```

## Related rules

- [`no-duplicate-if-branches`](./no-duplicate-if-branches.md) checks duplicate bodies within `if`/`else if`/`else` chains.
- [`no-lonely-if`](./no-lonely-if.md) combines nested conditions using `&&`.
- [`no-useless-else`](./no-useless-else.md) removes `else` after exiting branches, which can expose consecutive guards.
- [`prefer-boolean-return`](./prefer-boolean-return.md) can further simplify a combined boolean guard followed by the opposite boolean return.
