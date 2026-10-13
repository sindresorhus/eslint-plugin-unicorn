# switch-case-braces

📝 Enforce consistent brace style for `case` clauses.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

1. Forbid braces for empty clauses.
1. Enforce braces for non-empty clauses.

Braces give each non-empty case its own explicit scope and keep case-body structure consistent.

Cases with lexical declarations that are used outside the case are reported without a fix, because adding braces would hide the bindings from the other cases.

## Examples

```js
// ❌
switch (foo) {
	case 1: {
	}
	case 2: {
		doSomething();
		break;
	}
}

// ✅
switch (foo) {
	case 1:
	case 2: {
		doSomething();
		break;
	}
}
```

```js
// ❌
switch (foo) {
	case 1:
		doSomething();
		break;
}

// ✅
switch (foo) {
	case 1: {
		doSomething();
		break;
	}
}
```

## Options

Type: `string`\
Default: `'always'`

- `'always'` (default)
  - Require braces for non-empty clauses, and forbid braces for empty clauses.
- `'avoid'`
  - Only allow braces when the block contains a top-level declaration.
- `'single-statement'`
  - Require each case clause to have a single statement. Multiple statements must be wrapped in a block. A block with one statement is allowed only when that statement needs its own scope.

The following cases are considered valid:

```js
/* eslint unicorn/switch-case-braces: ["error", "avoid"] */
switch (foo) {
	case 1:
		doSomething();
		break;
}
```

```js
/* eslint unicorn/switch-case-braces: ["error", "avoid"] */
switch (foo) {
	case 1: {
		const bar = 2;
		doSomething(bar);
		break;
	}
}
```

The following case is considered invalid:

```js
/* eslint unicorn/switch-case-braces: ["error", "avoid"] */
switch (foo) {
	case 1: {
		doSomething();
		break;
	}
}
```

The following cases are considered valid:

```js
/* eslint unicorn/switch-case-braces: ["error", "single-statement"] */
function unicorn(foo) {
	switch (foo) {
		case 1:
			return foo;
		case 2: {
			doSomething();
			break;
		}
		case 3: {
			const bar = 2;
		}
	}
}
```

The following cases are considered invalid:

```js
/* eslint unicorn/switch-case-braces: ["error", "single-statement"] */
function unicorn(foo) {
	switch (foo) {
		case 1:
			doSomething();
			break;
		case 2: {
			return foo;
		}
	}
}
```
