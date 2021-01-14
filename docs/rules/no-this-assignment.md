# Disallow assign `this` to variable

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
