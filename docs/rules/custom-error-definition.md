# custom-error-definition

📝 Enforce correct `Error` subclassing.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces a consistent way of defining `Error` subclasses. It works with superclasses whose names match the rule's `*Error` naming pattern.

When a named error constructor accepts a message, it should also accept `options` and pass it to `super()` so native `Error#cause` is preserved. This convention is only enforced for native error bases that accept `ErrorOptions` as their second parameter. `AggregateError` accepts `ErrorOptions` as its third parameter, while `SuppressedError` does not accept `ErrorOptions`, so neither uses this convention.

Custom error base classes may use different constructor parameters, so the rule does not enforce the native `ErrorOptions` convention for them.

```js
// ✅
class UserNotFoundError extends GraphQLError {
	constructor(userId) {
		super(`User "${userId}" does not exist`, {extensions: {code: 'NOT_FOUND'}});
		this.name = 'UserNotFoundError';
	}
}
```

## Examples

```js
// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		// The `this.message` assignment is useless as it's already set via the `super()` call.
		this.message = message;
		this.name = 'CustomError';
	}
}

// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(undefined, options);
		// Pass the error message to `super()` instead of setting `this.message`.
		this.message = message;
		this.name = 'CustomError';
	}
}

// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		// No `name` property set. The name property is needed so the
		// error shows up as `[CustomError: foo]` and not `[Error: foo]`.
	}
}

// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		// Use a string literal to set the `name` property as it will not change after minifying.
		this.name = this.constructor.name;
	}
}

// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		// The `name` property should be set to the class name.
		this.name = 'MyError';
	}
}

// ✅
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'CustomError';
	}
}
```

```js
// ❌
// The class name should be capitalized and end with `Error`.
class foo extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'foo';
	}
}

// ✅
class FooError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'FooError';
	}
}
```

```js
// ❌
class CustomError extends Error {
	constructor(message, details) {
		super(message);
		this.details = details;
		this.name = 'CustomError';
	}
}

// ✅
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		this.details = options?.details;
		this.name = 'CustomError';
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
// The message is hard-coded and the error options are passed to `super()` inline, so no `options` parameter is needed.
class CustomError extends Error {
	constructor(cause) {
		super('My custom error', {cause});
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

```js
// ✅
class CustomError extends Error {
	name = 'CustomError';
}
```

When defining a custom `message` accessor, don't pass the message to `super()` as it would shadow the accessor with an own `message` property. Store the message somewhere else instead.

```js
// ❌
class CustomError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'CustomError';
	}

	get message() {
		return 'Custom message';
	}
}

// ✅
class CustomError extends Error {
	#message;

	constructor(message, options) {
		super(undefined, options);
		this.#message = message;
		this.name = 'CustomError';
	}

	get message() {
		return this.#message;
	}
}
```
