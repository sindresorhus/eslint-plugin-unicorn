# Disallow recursive access to `this` within getters and setters

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prevents recursive access to `this` within getter and setter methods in objects and classes, avoiding infinite recursion and stack overflow errors.

## Examples

```js
// ❌
const foo = {
	get bar() {
		return this.bar;
	}
};

// ✅
const foo = {
	get bar() {
		return this.baz;
	}
};
```

```js
// ❌
class Foo {
	get bar() {
		return this.bar;
	}
}

// ✅
class Foo {
	get bar() {
		return this.baz;
	}
}
```

```js
// ❌
const foo = {
	set bar(value) {
		this.bar = value;
	}
};

// ✅
const foo = {
	set bar(value) {
		this._bar = value;
	}
};
```

```js
// ❌
class Foo {
	set bar(value) {
		this.bar = value;
	}
}

// ✅
class Foo {
	set bar(value) {
		this._bar = value;
	}
}
```
