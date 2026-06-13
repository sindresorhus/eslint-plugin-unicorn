# require-proxy-trap-boolean-return

📝 Require boolean-returning Proxy traps to return booleans.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some Proxy traps are specified to return a boolean result. Returning `undefined` by forgetting to return can throw in common operations, and returning another truthy or falsy value relies on implicit coercion.

This rule checks inline object-literal handlers passed to `new Proxy()` and `Proxy.revocable()`.

## Examples

```js
// ❌
new Proxy(target, {
	set(target, property, value) {
		target[property] = value;
	}
});

// ✅
new Proxy(target, {
	set(target, property, value) {
		target[property] = value;
		return true;
	}
});
```

```js
// ❌
new Proxy(target, {
	deleteProperty() {
		return 1;
	}
});

// ✅
new Proxy(target, {
	deleteProperty() {
		return true;
	}
});
```

```js
// ✅
new Proxy(target, {
	set(target, property, value) {
		return Reflect.set(target, property, value);
	}
});
```
