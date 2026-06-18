# prefer-ternary

📝 Prefer ternaries and direct boolean returns over simple `if` statements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces simpler return or assignment forms over 'simple' `if` statements. A simple statement has one mergeable branch statement on each side, or a return branch followed by an adjacent mergeable `return`.

It also simplifies `if` statements whose branches, or adjacent following `return`, only return boolean literals.

It intentionally ignores standalone `await`, `yield`, and `throw` branches because ternaries there usually reduce readability without assigning or returning a value.

It also detects `let` declarations immediately followed by an `if` that reassigns the variable, which can be replaced with a single declaration using a ternary. The declaration is `const` when the variable has no later writes, and remains `let` when later writes require mutability.

Using an `if-else` statement typically results in more lines of code than a single ternary expression, which leads to an unnecessarily larger codebase that is more difficult to maintain.

Additionally, using an `if-else` statement can result in defining variables using `let` or `var` solely to be reassigned within the blocks. This leads to variables being unnecessarily mutable and prevents `prefer-const` from flagging the variable.

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
		return true;
	}

	return false;
}

// ✅
function unicorn() {
	return Boolean(test);
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
  - Always report supported `IfStatement` returns and assignments that can be simplified.
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
