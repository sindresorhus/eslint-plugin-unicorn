# prefer-short-arrow-method

📝 Prefer arrow function properties over methods with a single return.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

For object literal methods that simply return a value with no other logic, arrow function syntax is more concise. This rule applies only to object literals, not classes, since class methods have different prototype and binding behavior.

Methods using `this`, `arguments`, `super`, `new.target`, or `eval()` are excluded because arrow functions would change their behavior.

This rule can mix arrow properties and method shorthand within the same object when only some methods are convertible. Enable it only when concise arrow properties are preferred over object-level method style consistency.

## Examples

```js
// ❌ - Verbose method syntax for simple return
const api = {
	getUrl() {
		return 'https://api.example.com';
	},
};

// ✅ - Concise arrow function
const api = {
	getUrl: () => 'https://api.example.com',
};
```

```js
// ❌ - Method with parameter
const calculator = {
	add(a, b) {
		return a + b;
	},
};

// ✅ - Arrow function is more concise
const calculator = {
	add: (a, b) => a + b,
};
```

```js
// ❌ - Async method with simple return
const asyncApi = {
	async fetchData(url) {
		return fetch(url);
	},
};

// ✅ - Arrow function is cleaner
const asyncApi = {
	fetchData: async (url) => fetch(url),
};
```

```js
// ✅ - Keep regular method when using 'this' or other context-dependent code
const user = {
	getName() {
		return this.firstName + ' ' + this.lastName;
	},
	getRole() { // Can't convert to arrow - uses 'this'
		return this.role;
	},
};
```
