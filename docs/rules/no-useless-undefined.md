# Disallow useless `undefined`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`undefined` is the default value for new variables, parameters, return statements, etc… so specifying it doesn't make any difference.

Where passing `undefined` as argument is required is due to bad TypeScript types in functions, in which case you can use `checkArguments: false` option.

Using `undefined` as arrow function body sometimes make the purpose more explicit. You can use the `checkArrowFunctionBody: false` option to allow this.

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

### checkArrowFunctionBody

Type: `boolean`\
Default: `true`

Disallow the use of `undefined` as arrow function body. Pass `checkArrowFunctionBody: false` to disable checking them.

#### Fail

```js
// eslint unicorn/no-useless-undefined: ["error", {"checkArrowFunctionBody": true}]
const foo = () => undefined;
```

#### Pass

```js
// eslint unicorn/no-useless-undefined: ["error", {"checkArrowFunctionBody": false}]
const foo = () => undefined;
```

## Conflict with ESLint `array-callback-return` and `getter-return` rules

We recommend setting `allowImplicit` option to `true` for these ESLint rules:

- [`array-callback-return`](https://eslint.org/docs/rules/array-callback-return#options)
- [`getter-return`](https://eslint.org/docs/rules/getter-return#options)

```json
{
	"rules": {
		"array-callback-return": [
			"error",
			{
				"allowImplicit": true
			}
		],
		"getter-return": [
			"error",
			{
				"allowImplicit": true
			}
		]
	}
}
```
