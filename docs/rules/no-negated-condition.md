# no-negated-condition

📝 Disallow negated conditions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Negated conditions are more difficult to understand. Code can be made more readable by inverting the condition.

The rule checks ternaries and `if`/`else` pairs, including the final `else if`/`else` pair.

It also checks `&&`/`||` chains where every operand is negated with `!`, `!=`, or `!==`. Parenthesized groups with the same operator are supported; mixed operators between operands and non-negated operands are ignored.

TypeScript assertions wrapping negated operands or the whole condition are ignored to preserve their types. Assertions inside negations, such as `!(value as boolean)`, are supported.

Use [`no-unnecessary-boolean-comparison`](./no-unnecessary-boolean-comparison.md) to simplify `value === false` before inversion, using TypeScript type information when available.

This is an improved version of the [`no-negated-condition`](https://eslint.org/docs/latest/rules/no-negated-condition) ESLint rule that makes it automatically fixable. [ESLint did not want to make it fixable.](https://github.com/eslint/eslint/issues/14792)

Comments directly before branches move with them during autofixing. Comments directly after branch expressions or bodies prevent autofixing because their association is ambiguous.

Autofixing skips a first negation that exposes an unparenthesized object literal, function expression, or class expression. Parenthesize the argument to enable fixing, for example `!({})`.

Autofixing also skips non-delegating `yield` expressions when removing the first negation leaves a line break before an unparenthesized argument.

## Replacement for ESLint `no-negated-condition`

This rule replaces ESLint's built-in `no-negated-condition` rule, which Unicorn presets disable when this rule is enabled.

## Examples

```js
// ❌
const foo = !a && !b ? x : y;

// ✅
const foo = a || b ? y : x;
```

```js
// ❌
const foo = a != null && b != null ? x : y;

// ✅
const foo = a == null || b == null ? y : x;
```

```js
// ❌
if (!a || !b) {
	x();
} else {
	y();
}

// ✅
if (a && b) {
	y();
} else {
	x();
}
```

```js
// ❌
if (!a) {
	doSomethingC();
} else {
	doSomethingB();
}

// ✅
if (a) {
	doSomethingB();
} else {
	doSomethingC();
}
```

```js
// ❌
if (a !== b) {
	doSomethingC();
} else {
	doSomethingB();
}

// ✅
if (a === b) {
	doSomethingB();
} else {
	doSomethingC();
}
```

```js
// ❌
!a ? c : b

// ✅
a ? b : c
```

```js
// ❌
if (a != b) {
	doSomethingC();
} else {
	doSomethingB();
}

// ✅
if (a == b) {
	doSomethingB();
} else {
	doSomethingC();
}
```

```js
// ✅
const foo = !a && b ? x : y;
```

```js
// ✅
if (!a) {
	doSomething();
}
```

```js
// ✅
if (!a) {
	doSomething();
} else if (b) {
	doSomethingElse();
}
```

```js
// ✅
if (a != b) {
	doSomething();
}
```
