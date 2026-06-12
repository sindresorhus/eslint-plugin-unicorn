# class-reference-in-static-methods

📝 Enforce consistent class references in static methods.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces either dynamic static dispatch with `this` and `super`, or direct references with class names.

By default, it prefers `this` and `super`.

## Examples

```js
// ❌
class Foo extends Bar {
	static baz() {
		Foo.qux();
		Bar.qux();
	}
}

// ✅
class Foo extends Bar {
	static baz() {
		this.qux();
		super.qux();
	}
}
```

With `{preferThis: false, preferSuper: false}`:

```js
// ❌
class Foo extends Bar {
	static baz() {
		this.qux();
		super.qux();
	}
}

// ✅
class Foo extends Bar {
	static baz() {
		Foo.qux();
		Bar.qux();
	}
}
```

## Options

Type: `object`

### preferThis

Type: `boolean`\
Default: `true`

Prefer `this` over the current class name in static methods.

### preferSuper

Type: `boolean`\
Default: `true`

Prefer `super` over the superclass name in static methods.
