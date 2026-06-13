# no-useless-undefined

📝 Disallow useless `undefined`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`undefined` is the default value for new variables, parameters, return statements, etc… so specifying it doesn't make any difference.

This rule does not check function call arguments in TypeScript files because TypeScript can require an explicit `undefined` argument when the parameter type includes `undefined`.

Using `undefined` as arrow function body sometimes makes the purpose more explicit. You can use the `checkArrowFunctionBody: false` option to allow this.

## Examples

```js
// ❌
let foo = undefined;

// ✅
let foo;
```

```js
// ❌
const {foo = undefined} = bar;

// ✅
const {foo} = bar;
```

```js
// ❌
const noop = () => undefined;

// ✅
const noop = () => {};
```

```js
// ❌
function foo() {
	return undefined;
}

// ✅
function foo() {
	return;
}
```

```js
// ❌
function* foo() {
	yield undefined;
}

// ✅
function* foo() {
	yield;
}
```

```js
// ❌
function foo(bar = undefined) {
}

// ✅
function foo(bar) {
}
```

```js
// ❌
function foo({bar = undefined}) {
}

// ✅
function foo({bar}) {
}
```

```js
// ❌
foo(undefined);

// ✅
foo();
```

```js
// ❌
const foo = index >= 0 ? array[index] : undefined;

// ✅
const foo = array[index];
```

Guarded indexed access is reported with an editor suggestion instead of an autofix because removing the guard changes when the access is evaluated.

## Options

Type: `object`

### checkArguments

Type: `boolean`\
Default: `true`

Disallow the use of `undefined` at the end of function call arguments in JavaScript files. TypeScript files are not checked because the compiler determines whether an argument can be omitted. Pass `checkArguments: false` to disable checking them in JavaScript files.

```js
// ❌
/* eslint unicorn/no-useless-undefined: ["error", {"checkArguments": true}] */
foo(bar, baz, undefined);

// ✅
foo(bar, baz);
```

```js
// ✅
/* eslint unicorn/no-useless-undefined: ["error", {"checkArguments": false}] */
foo(bar, baz, undefined);
```

### checkArrowFunctionBody

Type: `boolean`\
Default: `true`

Disallow the use of `undefined` as arrow function body. Pass `checkArrowFunctionBody: false` to disable checking them.

```js
/* eslint unicorn/no-useless-undefined: ["error", {"checkArrowFunctionBody": true}] */
// ❌
const foo = () => undefined;
```

```js
/* eslint unicorn/no-useless-undefined: ["error", {"checkArrowFunctionBody": true}] */
// ✅
const foo = () => {};
```

```js
/* eslint unicorn/no-useless-undefined: ["error", {"checkArrowFunctionBody": false}] */
// ✅
const foo = () => undefined;
```

## Conflict with ESLint `array-callback-return` and `getter-return` rules

We recommend setting `allowImplicit` option to `true` for these ESLint rules:

- [`array-callback-return`](https://eslint.org/docs/rules/array-callback-return#options)
- [`getter-return`](https://eslint.org/docs/rules/getter-return#options)

```js
{
	rules: {
		'array-callback-return': [
			'error',
			{
				allowImplicit: true,
			},
		],
		'getter-return': [
			'error',
			{
				allowImplicit: true,
			},
		],
	},
}
```
