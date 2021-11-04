# Enforce correct `Error` subclassing

Enforces the only valid way of `Error` subclassing. It works with any super class that ends in `Error`.

This rule is fixable.


## Fail

```js
class CustomError extends Error {
	constructor(message) {
		super(message);
		this.message = message;
		this.name = 'CustomError';
	}
}
```

The `this.message` assignment is useless as it's already set via the `super()` call.


```js
class CustomError extends Error {
	constructor(message) {
		super();
		this.message = message;
		this.name = 'CustomError';
	}
}
```

Pass the error message to `super()` instead of setting `this.message`.


```js
class CustomError extends Error {
	constructor(message) {
		super(message);
	}
}
```

No `name` property set. The name property is needed so the error shows up as `[CustomError: foo]` and not `[Error: foo]`.


```js
class CustomError extends Error {
	constructor(message) {
		super(message);
		this.name = this.constructor.name;
	}
}
```

Use a string literal to set the `name` property as it will not change after minifying.


```js
class CustomError extends Error {
	constructor(message) {
		super(message);
		this.name = 'MyError';
	}
}
```

The `name` property should be set to the class name.


```js
class foo extends Error {
	constructor(message) {
		super(message);
		this.name = 'foo';
	}
}
```

The class name is invalid. It should be capitalized and end with `Error`. In this case it should be `FooError`.


## Pass

```js
class CustomError extends Error {
	constructor(message) {
		super(message);
		this.name = 'CustomError';
	}
}
```

```js
class CustomError extends Error {
	constructor() {
		super('My custom error');
		this.name = 'CustomError';
	}
}
```

```js
class CustomError extends TypeError {
	constructor() {
		super();
		this.name = 'CustomError';
	}
}
```
