# Prefer class field declarations over `this` assignments in constructor

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces the use of class field declarations for static values, instead of assigning them in constructors using `this`.

> To avoid leaving empty constructors after autofixing, use the [`no-useless-constructor` rule](https://eslint.org/docs/latest/rules/no-useless-constructor).

## Fail

```js
class Foo {
	constructor() {
		this.foo = 'foo';
	}
}

class MyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MyError";
	}
}
```

## Pass

```js
class Foo {
	foo = 'foo';
}

class MyError extends Error {
	name = "MyError"
}
```
