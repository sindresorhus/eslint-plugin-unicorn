# prefer-smaller-scope

📝 Prefer declaring variables in the smallest possible scope.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Declare variables as close as possible to where they are used. If an uninitialized `let` variable is only assigned and read inside a nested block, it can be declared in that block instead. This reduces the amount of code that can access the variable and makes the lifetime of the value easier to see.

This rule intentionally starts with a narrow, safe pattern: a single uninitialized `let` declaration, one direct assignment in a nested block, and reads only after that assignment inside the same block.

## Examples

```js
// ❌
function foo() {
	let value;
	while (condition) {
		value = getValue();
		console.log(value);
	}
}
```

```js
// ✅
function foo() {
	while (condition) {
		const value = getValue();
		console.log(value);
	}
}
```

```js
// ❌
function foo() {
	let value;
	if (condition) {
		value = getValue();
		console.log(value);
	}
}
```

```js
// ✅
function foo() {
	if (condition) {
		const value = getValue();
		console.log(value);
	}
}
```

## Limitations

This rule does not check initialized declarations, `const`, `var`, destructuring, multi-variable declarations, compound assignments, or assignments that are not direct expression statements. It also ignores cases that would move a declaration across a function, class, static block, or dynamic scope boundary.

The rule only autofixes cases where comments do not need to be moved or removed. Cases with nearby comments, TypeScript annotations, or syntax-sensitive parenthesized assignments are reported without an autofix.
