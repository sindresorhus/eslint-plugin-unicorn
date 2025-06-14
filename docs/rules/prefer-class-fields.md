# Prefer class field declarations over `this` assignments in constructors

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces declaring property defaults with class fields instead of setting them inside the constructor.

> To avoid leaving empty constructors after autofixing, use the [`no-useless-constructor` rule](https://eslint.org/docs/latest/rules/no-useless-constructor).

## Examples

```js
// ❌
class Foo {
	constructor() {
		this.foo = 'foo';
	}
}

// ✅
class Foo {
	foo = 'foo';
}
```

```js
// ❌
class MyError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MyError';
	}
}

// ✅
class MyError extends Error {
	name = 'MyError'
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
