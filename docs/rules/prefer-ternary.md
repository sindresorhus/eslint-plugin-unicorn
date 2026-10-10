# prefer-ternary

📝 Prefer ternary expressions over simple `if` statements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prefers ternary expressions over simple `if`/`else` statements with one mergeable statement in each branch. It combines returns and assignments, and statements that share the same expression shape with one varying part. For returns, it also handles the equivalent flat form where another `return` immediately follows an `if` without an `else`.

Only plain `=` assignments to matching identifiers or array/object patterns (ignoring whitespace) are combined.

Direct arrows remain in identifier assignments and initializers to preserve function names.

Calls, method calls, constructors, binary expressions, member access, objects, and arrays use the same shallow matching as [`prefer-minimal-ternary`](./prefer-minimal-ternary.md). Matching `await`, `yield`, `yield*`, and `throw` wrappers are preserved. Entirely different expressions remain untouched by default.

Fixes move the ternary directly into the varying part when runtime and type safety allow it. Otherwise, returns and assignments retain the full ternary conversion; other statements may be reported without a fix. Type-sensitive object transformations can offer suggestions instead. See [`prefer-minimal-ternary`'s autofix limitations](./prefer-minimal-ternary.md#autofix-limitations).

It also detects `let` declarations immediately followed by an `if` that reassigns the variable, which can be replaced with a single declaration using a ternary. The declaration is `const` when the variable has no later writes, and remains `let` when later writes require mutability.

With full type information, assignment targets must have matching tokens and types. Declaration suggestions require an explicit type annotation.

## Readability boundaries

The rule skips:

- Bare `return;` in either branch. Explicit `return undefined;` remains eligible.
- Conditions or merged values containing:
  - Ternaries, except inside expression-bodied callbacks.
  - Statement blocks or class bodies, even on one line.
  - Multiline objects, arrays, JSX elements/fragments, or template literals.

These checks include nested expressions, such as call arguments and TypeScript wrappers, and apply in both modes. Wrapped calls, logical expressions, inline literals, and concise callbacks remain eligible unless excluded above. [`only-single-line`](#options) additionally excludes all multiline conditions and values.

The block, class body, and multiline restrictions also apply inside patterns, which may span lines in `always` mode.

Comments in or between merged statements, or trailing a following `return`, prevent edits.

## Examples

```js
// ❌
if (test) {
	call(a);
} else {
	call(b);
}

// ✅
call(test ? a : b);
```

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
// ❌
// Standalone throws with the same constructor
if (test) {
	throw new Error('foo');
} else {
	throw new Error('bar');
}

// ✅
throw new Error(test ? 'foo' : 'bar');
```

```js
// ❌
async function unicorn() {
	if (test) {
		await object.save(a);
	} else {
		await object.save(b);
	}
}

// ✅
async function unicorn() {
	await object.save(test ? a : b);
}
```

```js
// ❌
function* unicorn() {
	if (test) {
		yield a + 1;
	} else {
		yield b + 1;
	}
}

// ✅
function* unicorn() {
	yield (test ? a : b) + 1;
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
  - Always report supported `IfStatement` branches where a ternary expression can be used.
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

An optional second options object accepts `checkVaryingBase` and `checkComputedMemberAccess`, both defaulting to `false`. They have the same meaning as the corresponding [`prefer-minimal-ternary` options](./prefer-minimal-ternary.md#options).

```js
// eslint unicorn/prefer-ternary: ['error', 'always', {checkVaryingBase: true}]

// ❌
if (test) {
	a(value);
} else {
	b(value);
}

// ✅
(test ? a : b)(value);
```
