# Prefer ternary expressions over simple `if-else` statements

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of ternary expressions over  'simple' `if-else` statements, where 'simple' means the consequent and alternate are each one line and have the same basic type and form.

Using an `if-else` statement typically results in more lines of code than a single-line ternary expression, which leads to an unnecessarily larger codebase that is more difficult to maintain.

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
function* unicorn() {
	if (test) {
		yield a;
	} else {
		yield b;
	}
}

// ✅
function* unicorn() {
	yield (test ? a : b);
}
```

```js
// ❌
async function unicorn() {
	if (test) {
		await a();
	} else {
		await b();
	}
}

// ✅
async function unicorn() {
	await (test ? a() : b());
}
```

```js
// ❌
if (test) {
	throw new Error('foo');
} else {
	throw new Error('bar');
}

// ✅
const error = test ? new Error('foo') : new Error('bar');
throw error;
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

Type: `string | object`\
Default: `'always'`

### `'always'`

Always report when using an `IfStatement` where a ternary expression can be used.

### `{ onlySingleLine: true }`

Only check if the content of the `if` and/or `else` block is less than one line long.

```js
/* eslint unicorn/prefer-ternary: ["error", { "onlySingleLine": true }] */
// ✅
if (test) {
	foo = [
		'multiple line array'
	];
} else {
	foo = bar;
}
```

### `{ onlyAssignments: true }`

Only check if the statement is an assignment or return expression (where a value is being captured).

```js
/* eslint unicorn/prefer-ternary: ["error", { "onlyAssignments": true }] */
// ✅
// Yield statements are ignored
function* unicorn() {
	if (test) {
		yield a;
	} else {
		yield b;
	}
}

// ✅
// Standalone await statements are ignored
async function unicorn() {
	if (test) {
		await a;
	} else {
		await b;
	}
}

// ❌
// Assignments are checked, and combined with preceding uninitialized declaration
let foo;
if (test) {
	foo = 1;
} else {
	foo = 2;
}
// ✅ Fixed to: let foo = test ? 1 : 2;

// ❌
// Return statements are checked
function unicorn() {
	if (test) {
		return a;
	} else {
		return b;
	}
}
// ✅ Fixed to: return test ? a : b;
```

With this option, `await` expressions stay inside each branch of the ternary rather than being hoisted:

```js
/* eslint unicorn/prefer-ternary: ["error", { "onlyAssignments": true }] */
// ❌
async function unicorn() {
	if (test) {
		foo = await a;
	} else {
		foo = await b;
	}
}
// ✅ Fixed to: foo = test ? (await a) : (await b);

// ❌
async function unicorn() {
	if (test) {
		return await a;
	} else {
		return await b;
	}
}
// ✅ Fixed to: return test ? (await a) : (await b);

// ❌
// Combined with preceding declaration
async function unicorn() {
	let foo;
	if (test) {
		foo = await a;
	} else {
		foo = await b;
	}
}
// ✅ Fixed to: let foo = test ? (await a) : (await b);
```

### Combined options

Options can be combined:

```js
/* eslint unicorn/prefer-ternary: ["error", { "onlySingleLine": true, "onlyAssignments": true }] */
// ✅
// Multi-line assignment is ignored
if (test) {
	foo = {
		a: 1
	};
} else {
	foo = bar;
}
```
