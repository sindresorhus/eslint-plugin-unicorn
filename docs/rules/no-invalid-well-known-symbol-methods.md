# no-invalid-well-known-symbol-methods

📝 Disallow invalid implementations of well-known symbol methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some well-known symbol methods must return protocol objects directly. Marking those methods as `async` or returning a Promise changes the value seen by the protocol, which does not unwrap it.

`Symbol.dispose` is also synchronous. A Promise returned from it is ignored by `using` and is not awaited. A generator disposer is also invalid because calling it does not run the body. Use a normal method for synchronous disposal or `Symbol.asyncDispose` for asynchronous disposal.

## Examples

```js
// ❌
class Resource {
	async [Symbol.dispose]() {}
}

// ✅
class Resource {
	async [Symbol.asyncDispose]() {}
}
```

```js
// ❌
const iterable = {
	async *[Symbol.iterator]() {
		yield value;
	},
};

// ✅
const iterable = {
	async *[Symbol.asyncIterator]() {
		yield value;
	},
};
```

```js
// ❌
const asyncIterable = {
	async [Symbol.asyncIterator]() {
		return iterator;
	},
};

// ✅
const asyncIterable = {
	async *[Symbol.asyncIterator]() {
		yield value;
	},
};
```
