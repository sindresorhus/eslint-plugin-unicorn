# prefer-ternary

📝 Prefer ternary expressions over simple `if` statements that return or assign values.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of ternary expressions over simple `if` statements that return or assign a value. It handles `if`/`else` statements with one mergeable statement in each branch. For returns, it also handles the equivalent flat form where another `return` immediately follows an `if` without an `else`.

For assignments, only plain `=` assignments to identifiers or matching destructuring patterns are combined. Standalone property, compound, and logical assignments are ignored to preserve evaluation order. When nested inside returns or supported assignments, they remain in the ternary branches.

Array and object destructuring assignments are supported when both branches use the same pattern, ignoring whitespace. The pattern itself may span multiple lines in `always` mode. Patterns containing statement blocks, class bodies, or multiline array/object literals, JSX elements/fragments, or template literals are ignored.

With full TypeScript type information, the rule also requires identical target tokens and skips assignments whose target expressions have different resolved types in the branches, preserving narrowed contextual types. Without type information, targets are matched by syntax.

It intentionally ignores standalone `await`, `yield`, and `throw` branches because ternaries there usually reduce readability without assigning or returning a value.

It also detects `let` declarations immediately followed by an `if` that reassigns the variable, which can be replaced with a single declaration using a ternary. The declaration is `const` when the variable has no later writes, and remains `let` when later writes require mutability.

## Readability boundaries

The rule skips:

- Bare `return;` in either branch. Explicit `return undefined;` remains eligible.
- Conditions or merged values containing:
  - Ternaries, except inside expression-bodied callbacks.
  - Statement blocks or class bodies, even on one line.
  - Multiline objects, arrays, JSX elements/fragments, or template literals.

These checks include nested expressions, such as call arguments and TypeScript wrappers, and apply in both modes. Wrapped calls, logical expressions, inline literals, and concise callbacks remain eligible unless excluded above. [`only-single-line`](#options) additionally excludes all multiline conditions and values.

Comments in or between merged statements, or trailing a following `return`, prevent edits.

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
// ✅
// Preserve the early return to avoid nesting ternaries.
function unicorn() {
	if (test) {
		return a;
	}

	return String(otherTest ? b : c);
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
if (test) {
	[a, b] = first;
} else {
	[a, b] = second;
}

// ✅
[a, b] = test ? first : second;
```

```js
// ❌
if (test) {
	({a, b} = first);
} else {
	({a, b} = second);
}

// ✅
({a, b} = test ? first : second);
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
	bar = 2;
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
	foo = format(
		value,
	);
} else {
	foo = bar;
}
```
