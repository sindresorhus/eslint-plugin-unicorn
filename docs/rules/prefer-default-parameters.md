# Prefer default parameters over reassignment

Instead of reassigning a function parameter, default parameters should be used. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule only reports reassignments to literal values.

This rule is fixable.

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
