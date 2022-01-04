# Prefer default parameters over reassignment

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

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
