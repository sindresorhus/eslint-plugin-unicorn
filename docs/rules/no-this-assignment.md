# Disallow assigning `this` to a variable

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

`this` should be used directly. If you want a reference to `this` from a higher scope, consider using [arrow function expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) or [`Function#bind()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind).

## Fail

```js
const foo = this;

setTimeout(function () {
	foo.bar();
}, 1000);
```

```js
const foo = this;

class Bar {
	method() {
		foo.baz();
	}
}

new Bar().method();
```

## Pass

```js
setTimeout(() => {
	this.bar();
}, 1000);
```

```js
setTimeout(function () {
	this.bar();
}.bind(this), 1000);
```

```js
class Bar {
	constructor(fooInstance) {
		this.fooInstance = fooInstance;
	}
	method() {
		this.fooInstance.baz();
	}
}

new Bar(this).method();
```
