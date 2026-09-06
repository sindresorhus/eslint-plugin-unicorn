# prefer-ternary

📝 Prefer ternary expressions over simple `if` statements that return or assign values.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of ternary expressions over simple `if` statements that return or assign a value. Return branches can use either an explicit `else` or an immediately following `return` statement. Assignment branches must have one mergeable statement on each side with the same basic type and form.

It intentionally ignores standalone `await`, `yield`, and `throw` branches because ternaries there usually reduce readability without assigning or returning a value.

It also detects `let` declarations immediately followed by an `if` that reassigns the variable, which can be replaced with a single declaration using a ternary. The declaration is `const` when the variable has no later writes, and remains `let` when later writes require mutability.

Using branching statements typically results in more lines of code than a single ternary expression, which leads to an unnecessarily large codebase that is more difficult to maintain.

Additionally, branching statements can require a variable to use `let` or `var` solely so it can be reassigned. This adds unnecessary mutability and prevents `prefer-const` from flagging the variable.

## Examples

```js
// ❌
function unicorn() {
	if (test) {
		return a;
	} else {
		return b;
	}
}

// ✅
function unicorn() {
	return test ? a : b;
}
```

```js
// ❌
function unicorn() {
	if (test) {
		return a;
	}

	return b;
}

// ✅
function unicorn() {
	return test ? a : b;
}
```

```js
// ❌
let foo;
if (test) {
	foo = 1;
} else {
	foo = 2;
}

// ✅
let foo;
foo = test ? 1 : 2;
```

```js
// ❌
let items = defaultData;
if (data.length) {
	items = data;
}

// ✅
const items = data.length ? data : defaultData;
```

```js
// ✅
// Standalone yields
function* unicorn() {
	if (test) {
		yield a;
	} else {
		yield b;
	}
}
```

```js
// ✅
// Standalone awaits
async function unicorn() {
	if (test) {
		await a();
	} else {
		await b();
	}
}
```

```js
// ✅
// Standalone throws
if (test) {
	throw new Error('foo');
} else {
	throw new Error('bar');
}
```

```js
// ✅
// Multiple expressions
let foo;
let bar;
if (test) {
	foo = 1;
	bar = 2;
} else {
	foo = 2;
}
```

```js
// ✅
// Different expressions
function unicorn() {
	if (test) {
		return a;
	} else {
		throw new Error('error');
	}
}
```

```js
// ✅
// Assign to different variable
let foo;
let bar;
if (test) {
	foo = 1;
} else {
	baz = 2;
}
```

## Options

Type: `string`\
Default: `'always'`

- `'always'` (default)
  - Always report supported `IfStatement` returns and assignments where a ternary expression can be used.
- `'only-single-line'`
  - Only report when the condition and merged expressions are single-line.

```js
/* eslint unicorn/prefer-ternary: ["error", "only-single-line"] */
// ✅
if (test) {
	foo = [
		'multiple line array'
	];
} else {
	foo = bar;
}
```
