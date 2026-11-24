# prefer-class-fields

📝 Prefer class field declarations over `this` assignments in constructors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces declaring property defaults with class fields instead of setting them inside the constructor.

Class fields keep property initialization next to the declaration and avoid boilerplate in constructors.

Checks leading literal defaults for distinct properties, including nested literals and literal bracket keys. Fixes move one assignment at a time. Comments and class member conflicts can prevent edits.

In TypeScript and JavaScript with JSDoc types or `@ts-check`, array, object, signed numeric, and computed-key defaults are report-only. TypeScript const assertions are also report-only.

> To avoid leaving empty constructors after autofixing, use the [`no-useless-constructor` rule](https://eslint.org/docs/latest/rules/no-useless-constructor).

## Examples

```js
// ❌
class Model {
	constructor() {
		this.items = [];
		this.options = {enabled: true};
	}
}

// ✅
class Model {
	items = [];
	options = {enabled: true};
}
```

```js
// ❌
class Foo {
	foo = 'foo';
	constructor() {
		this.foo = 'bar';
	}
}

// ✅
class Foo {
	foo = 'bar';
}
```

```js
// ❌
class Foo {
	#foo = 'foo';
	constructor() {
		this.#foo = 'bar';
	}
}

// ✅
class Foo {
	#foo = 'bar';
}
```

```js
// ✅
class MyError extends Error {
	constructor(message) {
		super(message);
		this.name = 'MyError';
	}
}
```

An assignment after `super()` is ignored, because the parent class could define a setter with the same name, and a class field would shadow it.
