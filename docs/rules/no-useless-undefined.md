# Disallow useless `undefined`

This rule is fixable.

## Fail

```js
let foo = undefined;
```

```js
const {foo = undefined} = bar;
```

```js
const noop = () => undefined;
```

```js
function foo() {
	return undefined;
}
```

```js
function* foo() {
	yield undefined;
}
```

```js
function foo(bar = undefined) {
}
```

```js
function foo({bar = undefined}) {
}
```

```js
foo(undefined);
```

## Pass

```js
let foo;
```

```js
const {foo} = bar;
```

```js
const noop = () => {};
```

```js
function foo() {
	return;
}
```

```js
function* foo() {
	yield;
}
```

```js
function foo(bar) {
}
```

```js
function foo({bar}) {
}
```

```js
foo();
```

## Options

Type: `object`

### ignoreArguments

Type: `boolean`<br>
Default: `false`

Pass `"ignoreArguments": true` to disable check on function call.

#### Fail

```js
// eslint unicorn/no-useless-undefined: ["error", {ignoreArguments: false}]
foo(undefined);
```

#### Pass

```js
// eslint unicorn/no-useless-undefined: ["error", {ignoreArguments: true}]
foo(undefined);
```

## Conflict with ESLint `array-callback-return` rule

We recommend setting the ESLint [`array-callback-return`](https://eslint.org/docs/rules/array-callback-return#top) rule option [`allowImplicit`](https://eslint.org/docs/rules/array-callback-return#options) to `true`:

```json
{
	"rules": {
		"array-callback-return": [
			"error",
			{
				"allowImplicit": true
			}
		]
	}
}
```
