# prefer-combined-guards

📝 Prefer combining consecutive guards with identical exit statements.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Consecutive guard clauses with the same exit statement can be combined using `||`. This removes duplicated exits while preserving the order in which conditions are evaluated.

This rule checks adjacent `if` statements without `else`. Each body must contain exactly one `return`, `throw`, `break`, or `continue` statement or a direct call to the global `process.exit()` function, with or without braces. Both exits must have the same kind. Their `return` or `throw` expressions, `break` or `continue` labels, or `process.exit()` calls must match.

Except for surrounding parentheses, exit expression source text must match exactly. The rule does not normalize formatting inside expressions or try to prove semantic equivalence. Differences in braces, whitespace around the exit expression, and optional trailing semicolons are allowed.

Value-carrying `return` and `throw` guards and `process.exit()` guards with an argument parsed as TypeScript are ignored because combining their conditions can lose control-flow narrowing in the exit expression. Exits containing tagged templates are also ignored because each tagged-template source location has its own cached template object.

Autofixes are withheld when there are comments inside or between the guards.

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
