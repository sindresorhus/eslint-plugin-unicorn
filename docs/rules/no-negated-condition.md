# Disallow negated conditions

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Negated conditions are more difficult to understand. Code can be made more readable by inverting the condition instead.

Improved version of the [`no-negated-condition`](https://eslint.org/docs/latest/rules/no-negated-condition) ESLint rule, which is automatically fixable.

## Fail

```js
if (!a) {
	doSomething();
} else {
	doSomethingElse();
}
```

```js
if (a !== b) {
	doSomething();
} else {
	doSomethingElse();
}
```

```js
!a ? c : b
```

```js
if (a != b) {
	doSomething();
} else {
	doSomethingElse();
}
```

## Pass

```js
if (a) {
	doSomething();
} else {
	doSomethingElse();
}
```

```js
if (a === b) {
	doSomething();
} else {
	doSomethingElse();
}
```

```js
a ? b : c
```

```js
if (a == b) {
	doSomething();
} else {
	doSomethingElse();
}
```

```js
if (!a) {
	doSomething();
}
```

```js
if (!a) {
	doSomething();
} else if (b) {
	doSomething();
}
```

```js
if (a != b) {
	doSomething();
}
```
