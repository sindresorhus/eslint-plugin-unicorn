# Disallow negated conditions

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Negated conditions are more difficult to understand. Code can be made more readable by inverting the condition.

This is an improved version of the [`no-negated-condition`](https://eslint.org/docs/latest/rules/no-negated-condition) ESLint rule that makes it automatically fixable. [ESLint did not want to make it fixable.](https://github.com/eslint/eslint/issues/14792)

## Examples

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
