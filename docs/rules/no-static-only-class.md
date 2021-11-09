# Forbid classes that only have static members

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

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
