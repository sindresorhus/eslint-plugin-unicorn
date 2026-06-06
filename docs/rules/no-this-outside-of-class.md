# no-this-outside-of-class

📝 Disallow `this` outside of classes.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`this` should only be used when JavaScript class syntax defines the receiver. Prefer classes for stateful objects instead of relying on constructor functions, manually patched prototypes, object-literal methods, top-level `this`, or callback APIs that bind `this`.

This rule is intentionally strict. Vue options-style methods, object methods, and SDK callbacks that bind `this` are unsupported. Disable the rule for that file or block when those patterns are intentional.

## Examples

```js
// ❌
function Foo(value) {
	this.value = value;
}

// ❌
const foo = {
	method() {
		return this.value;
	}
};

// ❌
Foo.prototype.method = function () {
	this.value();
};

// ✅
class Foo {
	constructor(value) {
		this.value = value;
	}

	method() {
		return this.value;
	}
}
```

```js
// ❌
class Foo {
	method() {
		function getValue() {
			return this.value;
		}

		return getValue();
	}
}

// ✅
class Foo {
	method() {
		const getValue = () => this.value;
		return getValue();
	}
}
```
