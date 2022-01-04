# Forbid classes that only have static members

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

A class with only static members could just be an object instead.

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
