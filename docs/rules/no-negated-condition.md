# no-negated-condition

📝 Disallow negated conditions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Negated conditions are more difficult to understand. Code can be made more readable by inverting the condition.

The rule checks ternary expressions and `if` statements whose alternate is an `else` branch rather than another `if` statement. This includes the last `else if` in a chain when it has an `else` branch.

The rule also checks `&&` and `||` chains where every operand is negated with `!`, `!=`, or `!==`. Parenthesized groups using the same operator are supported. Chains with a non-negated operand or a mix of `&&` and `||` between negated operands are not reported.

TypeScript assertions around negated operands or the entire condition are not unwrapped, because inverting the condition could invalidate the asserted type. Assertions inside a negation, such as `!(value as boolean)`, are supported.

Use [`no-unnecessary-boolean-comparison`](./no-unnecessary-boolean-comparison.md) to simplify comparisons such as `value === false` before this rule inverts the condition. That rule can use TypeScript type information to recognize boolean values.

This is an improved version of the [`no-negated-condition`](https://eslint.org/docs/latest/rules/no-negated-condition) ESLint rule that makes it automatically fixable. [ESLint did not want to make it fixable.](https://github.com/eslint/eslint/issues/14792)

Comments directly before branches move with them during autofixing. Comments directly after branch expressions or bodies prevent autofixing because their association is ambiguous.

Autofixing is also skipped when removing the first negation would expose an unparenthesized object literal, function expression, or class expression, which can be parsed differently in some contexts. Parenthesizing the negated argument makes the fix available, for example `!({})`.

For non-delegating `yield` expressions, autofixing is skipped when removing the first negation would leave a line break between `yield` and its unparenthesized argument.

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
