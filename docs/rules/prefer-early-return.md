# prefer-early-return

📝 Prefer early returns over conditionals wrapping the remainder of the function body.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Avoid wrapping the rest of a function body in a conditional. A guard clause often makes the main path clearer by handling exceptional cases first.

By default, this rule reports when the last statement of a block-bodied function is an `if` statement without `else`, even when other statements precede it. It does not report nested `if` statements, loops, or functions that continue after the `if`.

## Examples

```js
// ❌
function foo() {
	doSomethingBefore();
	if (condition) {
		doSomething();
		doSomethingElse();
	}
}

// ✅
function foo() {
	doSomethingBefore();
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

Maximum number of statements allowed in a conditional wrapper at the end of a function body.

With the default, a single-statement wrapper is allowed:

```js
function foo() {
	if (condition) {
		doSomething();
	}
}
```

Set `maximumStatements` to `0` to report any non-empty conditional wrapper at the end of a function body:

```js
'unicorn/prefer-early-return': [
	'error',
	{
		maximumStatements: 0,
	},
]
```

Autofix is conservative. When statements precede the final `if`, direct `let` or `const` declarations in its body prevent automatic fixes and editor suggestions. It skips wrappers with comments outside the condition or moved body, lexical names that collide with the containing function scope or are used in the condition, direct `eval(...)` with moved lexical declarations, direct function, class, TypeScript, `using`, or `await using` declarations, and multiline-sensitive strings, templates, or JSX. Trailing wrapper comments may still get editor suggestions; multiline unbraced consequents are report-only.

### checkShortBodies

Type: `boolean`\
Default: `false`

Require conditional wrapping instead of an early `return` for short bodies. This applies when the body after the guard, or the explicit `else` body, contains between one and `maximumStatements` direct statements, excluding empty statements. With `maximumStatements: 0`, this option has no effect. The rule's existing handling of wrappers above `maximumStatements` remains unchanged.

```js
'unicorn/prefer-early-return': [
	'error',
	{
		checkShortBodies: true,
	},
]
```

```js
// ❌
function foo() {
	if (!condition) {
		return;
	}

	doSomething();
}

// ❌
function foo() {
	if (!condition) {
		return;
	} else {
		doSomething();
	}
}

// ✅
function foo() {
	if (condition) {
		doSomething();
	}
}
```

The guard must be the first statement of the whole function body and contain only a bare `return;`. An explicit `else` is supported only when the `if` is the whole body; `else if` chains are ignored. Guards after preceding statements and guards that perform additional work are ignored.

Autofix preserves an existing `else` block's scope. Otherwise, direct declarations whose scope would change prevent autofixing. Comments in the rewritten range or after it also prevent autofixing, as do multiline-sensitive tokens in statements that would need reindentation. These cases are still reported.
