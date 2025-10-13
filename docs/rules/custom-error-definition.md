# Enforce correct `Error` subclassing

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the only valid way of `Error` subclassing. It works with any super class that ends in `Error`.

## Examples

```js
// ❌
class CustomError extends Error {
	constructor(message) {
		super(message);
		// The `this.message` assignment is useless as it's already set via the `super()` call.
		this.message = message;
		this.name = 'CustomError';
	}
}

// ❌
class CustomError extends Error {
	constructor(message) {
		super();
		// Pass the error message to `super()` instead of setting `this.message`.
		this.message = message;
		this.name = 'CustomError';
	}
}

// ❌
class CustomError extends Error {
	constructor(message) {
		super(message);
		// No `name` property set. The name property is needed so the
		// error shows up as `[CustomError: foo]` and not `[Error: foo]`.
	}
}

// ❌
class CustomError extends Error {
	constructor(message) {
		super(message);
		// Use a string literal to set the `name` property as it will not change after minifying.
		this.name = this.constructor.name;
	}
}

// ❌
class CustomError extends Error {
	constructor(message) {
		super(message);
		// The `name` property should be set to the class name.
		this.name = 'MyError';
	}
}

// ✅
class CustomError extends Error {
	constructor(message) {
		super(message);
		this.name = 'CustomError';
	}
}
```

```js
// ❌
// The class name should be capitalized and end with `Error`.
class foo extends Error {
	constructor(message) {
		super(message);
		this.name = 'foo';
	}
}

// ✅
class FooError extends Error {
	constructor(message) {
		super(message);
		this.name = 'FooError';
	}
}
```

```js
// ✅
class CustomError extends Error {
	constructor() {
		super('My custom error');
		this.name = 'CustomError';
	}
}
```

```js
// ✅
class CustomError extends TypeError {
	constructor() {
		super();
		this.name = 'CustomError';
	}
}
```
