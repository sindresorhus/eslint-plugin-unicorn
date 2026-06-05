# no-this-assignment

📝 Disallow assigning `this` to a variable.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`this` should be used directly. If you want a reference to `this` from a higher scope, consider using [arrow function expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) or [`Function#bind()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind).

## Examples

```js
// ❌
const foo = this;

setTimeout(function () {
	foo.bar();
}, 1000);

// ✅
setTimeout(() => {
	this.bar();
}, 1000);

// ✅
setTimeout(function () {
	this.bar();
}.bind(this), 1000);
```

```js
// ❌
const foo = this;

class Bar {
	method() {
		foo.baz();
	}
}

new Bar().method();

// ✅
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
