# no-undeclared-class-members

📝 Require class members to be declared.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Class members should be declared when they are used through `this`. Declaring fields, methods, getters, and setters in the class body makes typos visible and gives readers the class shape upfront.

Constructor assignments like `this.name = name` are treated as declarations. Classes with `extends` are ignored because the accessed member may come from a superclass. Static `this`, private members, computed member access, and dynamic initialization patterns like `Object.assign(this, data)` are unsupported.

Autofixes are only applied to simple non-constructor assignments like `this.name = name`. Reads, calls, compound assignments, updates, and constructor assignments are reported without a fix.

## Examples

```js
// ❌
class Foo {
	getName() {
		return this.name;
	}
}

// ✅
class Foo {
	name;

	getName() {
		return this.name;
	}
}
```

```js
// ❌
class Foo {
	callName() {
		this.name();
	}
}

// ✅
class Foo {
	name() {}

	callName() {
		this.name();
	}
}
```

```js
// ✅
class Foo {
	constructor(name) {
		this.name = name;
	}

	getName() {
		return this.name;
	}
}
```
