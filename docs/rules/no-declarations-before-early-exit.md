# no-declarations-before-early-exit

📝 Disallow declarations before conditional early exits when they are only used after the exit.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Declare variables as close as possible to where they are used. If a variable is declared before a guard clause but only used after it, the declaration can be moved below the guard. This avoids unnecessary initialization on the early-exit path and keeps the variable scope tighter.

This rule reports declarations before `return`, `throw`, `break`, and `continue` guard clauses.

## Examples

```js
// ❌
function foo(bar) {
	const result = 1;
	if (!bar) {
		return;
	}

	console.log(result);
}
```

```js
// ✅
function foo(bar) {
	if (!bar) {
		return;
	}

	const result = 1;
	console.log(result);
}
```

```js
// ❌
function foo(bar) {
	const result = 1;
	if (!bar) {
		throw new Error();
	}

	console.log(result);
}
```

```js
// ✅
function foo(bar) {
	if (!bar) {
		throw new Error();
	}

	const result = 1;
	console.log(result);
}
```

```js
// ❌
function foo(bar) {
	const result = getResult();
	if (!bar) {
		return;
	}

	console.log(result);
}
```

The last example is reported without an autofix because moving a function call can change observable behavior.

## Limitations

This rule intentionally uses a simple statement-list scan instead of full data-flow analysis. It only checks declarations and guard clauses that are direct children of the same block or top-level program. Switch cases are only checked when the case body is wrapped in a block.
