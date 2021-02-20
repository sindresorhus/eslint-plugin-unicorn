# Disallow `this` and `super` in static methods

Enforce use class names instead of `this` and `super` inside static methods.

This rule is partly fixable.

## Fail

```js
class Foo {
	static method() {
		return this.name;
	}
}
```

```js
class Foo extends Baz {
	static method() {
		return super.name;
	}
}
```

## Pass

```js
class Foo {
	static method() {
		return Foo.name;
	}
}
```

```js
class Foo extends Baz {
	static method() {
		return Baz.name;
	}
}
```
