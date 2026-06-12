# no-undeclared-class-members

📝 Require class members to be declared.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Class members should be declared when they are used through `this`. Declaring fields, methods, getters, and setters in the class body makes typos visible and gives readers the class shape upfront.

Constructor assignments like `this.name = name` are treated as declarations. Classes with `extends` are ignored because the accessed member may come from a superclass. Static `this`, private members, computed member access, and dynamic initialization patterns like `Object.assign(this, data)` are unsupported.

Editor suggestions are offered for simple non-constructor assignments like `this.name = name` when a declaration can be inserted cleanly. Reads, calls, compound assignments, updates, and constructor assignments are reported without a suggestion.

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

> [!NOTE]
> Declaring a class field like `name;` creates an own property with the value `undefined` on every instance before any method runs. This can change observable behavior, for example `Object.hasOwn(instance, 'name')`, so this rule provides editor suggestions instead of an autofix.
