# prefer-smaller-scope

📝 Prefer declaring variables and type aliases in the smallest possible scope.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Declare variables as close as possible to where they are used. This reduces the amount of code that can access the variable and makes the lifetime of the value easier to see.

For variables, the rule checks two patterns: an uninitialized `let` assigned once in a nested block and read only afterward in that block; and a `let` or `const` initialized with a primitive literal or a template literal without substitutions, immediately before an `if`, with all references in one braced branch.

TypeScript type aliases are also checked when all their uses fit inside a smaller block, including a function body, callback, loop, or branch. Uses in function signatures must remain visible outside the body. No type information is required.

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

```ts
// ❌
type Range = {start: number; end: number};
function overlaps() {
	const first: Range = {start: 0, end: 1};
	const second: Range = {start: 1, end: 2};
	return first.start < second.end && second.start < first.end;
}

// ✅
function overlaps() {
	type Range = {start: number; end: number};
	const first: Range = {start: 0, end: 1};
	const second: Range = {start: 1, end: 2};
	return first.start < second.end && second.start < first.end;
}
```

## Limitations

For variables, the rule ignores `var`, destructuring, multiple declarators, TypeScript ambient declarations, references crossing a function, class, or static block, and cases involving dynamic scope. An uninitialized `let` needs one direct `=` assignment followed only by reads in the same block.

An initialized variable declaration must immediately precede an `if`, use a primitive literal or substitution-free template, and have all value and TypeScript type references within one braced branch. Regular expressions and expressions such as `-1` are ignored.

Autofixes are omitted when comments could be displaced, a declaration has a TypeScript annotation, or a parenthesized assignment is syntax-sensitive.

Exported and ambient type aliases, and aliases with explicit variance annotations (`in` or `out`), are ignored.

Autofixes are omitted when moving an alias could change name resolution, displace comments, or alter multiline literals. Recursive aliases and aliases containing value references (`typeof` queries or computed property keys), `this` types, or identifiers named `await` or `yield` are reported without fixes. Value references can depend on control-flow narrowing, and recursive aliases can be needed outside a function when generating declarations for inferred return types.
