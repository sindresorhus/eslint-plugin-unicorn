# prefer-combined-guards

📝 Prefer combining consecutive guards with identical exit statements.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Consecutive guard clauses with identical exits can be combined using `||`, removing duplication while preserving condition evaluation order. By default, only simple conditions and `||` chains of simple conditions are checked.

This rule checks adjacent `if` statements without `else`. By default, each body, with or without braces, must consist of one `return`, `throw`, `break`, `continue`, or direct call to the global `process.exit()` function. Both exits must have the same kind, and their values, labels, or `process.exit()` calls must match.

Exit values, labels, and calls are compared by source text, ignoring surrounding parentheses where applicable. The rule does not normalize internal formatting or infer semantic equivalence. Braces, surrounding whitespace, and optional trailing semicolons may differ.

To preserve TypeScript control-flow narrowing, the rule ignores non-literal `return` and `throw` values and non-literal `process.exit()` arguments in TypeScript. It also ignores exits containing tagged templates because each source location has its own cached template object.

Guards with comments before either guard, inside them, or between them are ignored. Comments can describe distinct exit reasons, and combining the guards would obscure that separation.

## Examples

```js
// ❌
function check(context) {
	if (context.finished) {
		return;
	}

	if (context.cancelled) {
		return;
	}
}

// ✅
function check(context) {
	if (context.finished || context.cancelled) {
		return;
	}
}
```

```js
// ❌
function validate(value) {
	if (value < 0) {
		throw invalidValue;
	}

	if (!Number.isFinite(value)) {
		throw invalidValue;
	}
}

// ✅
function validate(value) {
	if ((value < 0) || !Number.isFinite(value)) {
		throw invalidValue;
	}
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

Bodies with additional statements or nested control flow are ignored by default (see [`checkMultiStatementBodies`](#checkmultistatementbodies)). Arbitrary identical bodies cannot generally be combined: both original bodies could execute when both conditions are true.

```js
// ✅
if (firstCondition) {
	count++;
}

if (secondCondition) {
	count++;
}
```

## Options

### checkCompoundConditions

Type: `boolean`\
Default: `false`

Also check compound conditions, such as `&&`, `??`, ternaries, and negated groups. Comments still prevent reporting.

```js
// With {checkCompoundConditions: true}:

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

### checkMultiStatementBodies

Type: `boolean`\
Default: `false`

Also check guards whose bodies have identical statements, compared by source text, before the same exit. Only one body can run, so combining them does not change behavior. Statements containing tagged templates are never combined.

In TypeScript, the statements could depend on each guard's narrowing, so they are only combined with [type information](https://typescript-eslint.io/getting-started/typed-linting) and when every reference has the same type in both bodies. Declarations inside the bodies, such as object literals and functions, get a new type in each body, so those bodies are not combined.

```js
// With {checkMultiStatementBodies: true}:

// ❌
for (const item of items) {
	if (item.hidden) {
		logSkip(item);
		continue;
	}

	if (item.disabled) {
		logSkip(item);
		continue;
	}

	processItem(item);
}

// ✅
for (const item of items) {
	if (item.hidden || item.disabled) {
		logSkip(item);
		continue;
	}

	processItem(item);
}
```

## Related rules

- [`no-duplicate-if-branches`](./no-duplicate-if-branches.md) checks duplicate bodies within `if`/`else if`/`else` chains.
- [`no-lonely-if`](./no-lonely-if.md) combines nested conditions using `&&`.
- [`no-useless-else`](./no-useless-else.md) removes `else` after exiting branches, which can expose consecutive guards.
- [`prefer-boolean-return`](./prefer-boolean-return.md) can further simplify a combined boolean guard followed by the opposite boolean return.
