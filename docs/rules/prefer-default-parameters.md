# Prefer default parameters over reassignment

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Instead of reassigning a function parameter, default parameters should be used. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule only reports reassignments to literal values.

You should disable this rule if you want your functions to deal with `null` and other falsy values the same way as `undefined`. Default parameters are exclusively applied [when `undefined` is received.](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters#passing_undefined_vs._other_falsy_values). However, we recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

## Fail

```js
function abc(foo) {
	foo = foo || 'bar';
}
```

```js
function abc(foo) {
	const bar = foo || 'bar';
}
```

## Pass

```js
function abc(foo = 'bar') {}
```

```js
function abc(foo) {
	foo = foo || bar();
}
```
