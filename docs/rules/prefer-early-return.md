# prefer-early-return

📝 Prefer early returns over full-function conditional wrapping.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Avoid wrapping an entire function body in a conditional. A guard clause often makes the main path clearer by handling exceptional cases first.

This rule only reports when a block-bodied function contains exactly one statement and that statement is an `if` statement without `else`. It does not report nested `if` statements, loops, or functions that continue after the `if`.

## Examples

```js
// ❌
function foo() {
	if (condition) {
		doSomething();
		doSomethingElse();
	}
}

// ✅
function foo() {
	if (!condition) {
		return;
	}

	doSomething();
	doSomethingElse();
}
```

```js
// ✅
function foo() {
	if (condition) {
		doSomething();
	}
}
```

```js
// ✅
function foo() {
	if (condition) {
		doSomething();
		doSomethingElse();
	}

	finish();
}
```

## Options

### maximumStatements

Type: `integer`\
Default: `1`

Maximum number of statements allowed in a whole-function conditional wrapper.

With the default, a single-statement wrapper is allowed:

```js
function foo() {
	if (condition) {
		doSomething();
	}
}
```

Set `maximumStatements` to `0` to report any non-empty whole-function conditional wrapper:

```js
'unicorn/prefer-early-return': [
	'error',
	{
		maximumStatements: 0,
	},
]
```

This rule is not fixable. Rewriting to an early return requires inverting conditions and moving statements, which is easy to get wrong when comments, directives, and automatic semicolon insertion are involved.
