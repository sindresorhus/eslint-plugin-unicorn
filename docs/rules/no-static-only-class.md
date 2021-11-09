# Forbid classes that only have static members

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

A class with only static members could just be an object instead.

This rule is partly fixable.

## Fail

```js
class X {
	static foo = false;
	static bar() {};
}
```

## Pass

```js
const X = {
	foo: false,
	bar() {}
};
```

```js
class X {
	static foo = false;
	static bar() {};

	constructor() {}
}
```

```js
class X {
	static foo = false;
	static bar() {};

	unicorn() {}
}
```

```js
class X {
	static #foo = false;
	static bar() {}
}
```
