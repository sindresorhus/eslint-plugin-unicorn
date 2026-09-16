# prefer-smaller-scope

📝 Prefer declaring variables in the smallest possible scope.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Declare variables as close as possible to where they are used. If an uninitialized `let` variable is only assigned and read inside a nested block, it can be declared in that block instead. This reduces the amount of code that can access the variable and makes the lifetime of the value easier to see.

This rule checks a single uninitialized `let` declaration, one direct assignment in a nested block, and reads only after that assignment inside the same block.

It also checks a single `let` or `const` declaration initialized with a primitive literal or a template literal without substitutions, immediately followed by an `if` statement. If all references are inside one braced `if` or `else` branch, the declaration can be moved to the beginning of that branch.

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

```js
// ❌
function foo(bar) {
	const result = 1;
	if (bar) {
		console.log(result);
	}
}
```

```js
// ✅
function foo(bar) {
	if (bar) {
		const result = 1;
		console.log(result);
	}
}
```

## Limitations

This rule does not check `var`, destructuring, multi-variable declarations, or TypeScript ambient declarations. For uninitialized `let` declarations, compound assignments and assignments that are not direct expression statements are also ignored. The rule also ignores cases with references crossing a function, class, static block, or dynamic scope boundary.

Initialized declarations are only checked immediately before an `if`, and only for primitive literals and template literals without substitutions. Other initializers, including regular expressions, function calls, identifier references, and expressions such as `-1`, are ignored. Moving these can change values, side effects, or evaluation timing. Initialized declarations are not moved into loops or functions, and references in the condition, outside the target branch, or in both branches prevent reporting. TypeScript type references also count as uses.

The rule only autofixes cases where comments do not need to be moved or removed. Cases with nearby comments, TypeScript annotations, or syntax-sensitive parenthesized assignments are reported without an autofix.
