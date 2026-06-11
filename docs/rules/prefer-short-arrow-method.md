# prefer-short-arrow-method

📝 Prefer arrow function properties over methods with a single return.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prefers concise arrow function properties for object literal methods that only return a value.

It intentionally only checks object literals. Class methods and class fields have different prototype and binding behavior, so they are out of scope.

Methods that use `this`, `arguments`, `super`, or `new.target` are ignored because converting them to arrow functions would change behavior.

## Examples

```js
// ❌
const object = {
	foo() {
		return bar;
	},
};

// ✅
const object = {
	foo: () => bar,
};
```

```js
// ❌
const object = {
	async foo(bar) {
		return bar;
	},
};

// ✅
const object = {
	foo: async (bar) => bar,
};
```

```js
// ✅
const object = {
	foo() {
		return this.foo;
	},
};
```
