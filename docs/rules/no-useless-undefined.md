# Disallow useless `undefined`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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

### checkArguments

Type: `boolean`\
Default: `true`

Disallow the use of `undefined` at the end of function call arguments. Pass `checkArguments: false` to disable checking them.

#### Fail

```js
// eslint unicorn/no-useless-undefined: ["error", {"checkArguments": true}]
foo(bar, baz, undefined);
```

#### Pass

```js
// eslint unicorn/no-useless-undefined: ["error", {"checkArguments": false}]
foo(bar, baz, undefined);
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
