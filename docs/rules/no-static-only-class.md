# Disallow classes that only have static members

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A class with only static members could just be an object instead.

## Examples

```js
// ❌
class X {
	static foo = false;
	static bar() {};
}

// ✅
const X = {
	foo: false,
	bar() {},
};
```

```js
// ✅
class X {
	static foo = false;
	static bar() {}

	constructor() {}
}
```

```js
// ✅
class X {
	static foo = false;
	static bar() {}

	unicorn() {}
}
```

```js
// ✅
class X {
	static #foo = false;
	static bar() {}
}
```
