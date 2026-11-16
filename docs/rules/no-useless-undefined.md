# no-useless-undefined

📝 Disallow useless `undefined`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript supplies `undefined` in several places, such as uninitialized variables and bare `return` statements. This rule checks uses of the global `undefined` that can be redundant.

`var` initializers are ignored because they can reset an existing binding, including on each loop iteration.

A default for an entire function parameter is kept because removing it can change the function's `length`.

Using `undefined` as an arrow function body can make its purpose clearer. Set `checkArrowFunctionBody: false` to allow it.

`return undefined` in a getter is ignored, since the [`getter-return`](https://eslint.org/docs/latest/rules/getter-return) rule requires getters to return a value. Getters defined with `Object.defineProperty()` are not detected.

The rule treats TypeScript files and JavaScript files with `@ts-check` or JSDoc type annotations as typed code. It keeps `undefined` in `let` initializers and default values because it can affect inferred types and function signatures. It also keeps explicit `undefined` arguments because TypeScript can require them.

In typed code, the rule checks `return undefined` only in functions with a TypeScript return annotation of `undefined` or `void`. It keeps `() => undefined` because removing the value can change the inferred return type to `void`.

When the return type is a union with a real value type, such as `number | undefined`, the explicit `undefined` is kept, since it can document intent and avoid conflicts with the [`consistent-return`](https://eslint.org/docs/latest/rules/consistent-return) rule.

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

Whether to check for trailing `undefined` arguments in JavaScript files without type annotations or `@ts-check`.

The rule skips known calls where an explicit `undefined` matters, such as `array.push(undefined)`, `array.splice(start, undefined)`, `Math.max(undefined)`, and `String(undefined)`. It matches statically known names in dot and bracket notation.

Other callees can still distinguish a trailing `undefined` from an omitted argument through `arguments.length` or rest parameters. Set `checkArguments: false` to preserve these calls.

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

Whether to check concise arrow function bodies in JavaScript files without type annotations or `@ts-check`.

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

Set `allowImplicit: true` in [`array-callback-return`](https://eslint.org/docs/rules/array-callback-return#options) to allow bare `return` statements in array callbacks. For getters defined with `Object.defineProperty()`, the same option in [`getter-return`](https://eslint.org/docs/rules/getter-return#options) allows the fix.

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
