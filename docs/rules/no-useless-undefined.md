# no-useless-undefined

📝 Disallow useless `undefined`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule flags redundant uses of the global `undefined`.

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

The indexed access example gets an editor suggestion. Removing the guard changes when the access runs.

## Exceptions

- A `var` initializer can reset an existing binding.
- Removing a default on the parameter itself can change the function's `length`.
- Getters written with `get` keep `return undefined` to satisfy [`getter-return`](https://eslint.org/docs/latest/rules/getter-return).

### Typed code

Typed code includes TypeScript files, Vue and Svelte files whose parser provides a TypeScript node map, and JavaScript with `@ts-check` or JSDoc types.

The rule keeps `undefined` in `let` initializers, defaults, call arguments, and concise arrows. It checks `return undefined` only with a `: undefined` or `: void` annotation. Without an annotation, removing `undefined` can change the inferred return type to `void`.

## Options

### checkArguments

Type: `boolean`\
Default: `true`

Whether to check for trailing `undefined` arguments in untyped JavaScript.

The rule skips calls like `array.push(undefined)` and `array['push'](undefined)` by name. Set `checkArguments: false` if your functions use `arguments.length` or rest parameters to tell omitted arguments from `undefined`.

### checkArrowFunctionBody

Type: `boolean`\
Default: `true`

Whether to check `() => undefined` in untyped JavaScript. Block-body `return` statements are checked separately.

## Conflicts with other ESLint rules

Set `allowImplicit: true` in [`array-callback-return`](https://eslint.org/docs/latest/rules/array-callback-return#options) to allow bare returns in array callbacks. The same option in [`getter-return`](https://eslint.org/docs/latest/rules/getter-return#options) allows bare returns in getters created with `Object.defineProperty()`.

[`no-useless-return`](https://eslint.org/docs/latest/rules/no-useless-return) can remove the bare `return` left by this rule. If the body becomes empty, a comment satisfies [`no-empty-function`](https://eslint.org/docs/latest/rules/no-empty-function).
