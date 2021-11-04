# Prefer default parameters over reassignment

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

Instead of reassigning a function parameter, default parameters should be used. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule only reports reassignments to literal values.

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
