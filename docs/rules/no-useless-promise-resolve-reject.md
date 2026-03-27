# no-useless-promise-resolve-reject

📝 Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Wrapping a return value in `Promise.resolve` in an async function or a `Promise#then`/`catch`/`finally` callback is unnecessary as all return values in async functions and promise callback functions are already wrapped in a `Promise`. Similarly, returning an error wrapped in `Promise.reject` is equivalent to simply `throw`ing the error. This is the same for `yield`ing in async generators as well.

## Examples

```js
// ❌
const main = async foo => {
	if (foo > 4) {
		return Promise.reject(new Error('🤪'));
	}

	return Promise.resolve(result);
};

// ✅
const main = async foo => {
	if (foo > 4) {
		throw new Error('🤪');
	}

	return result;
};
```

```js
// ❌
async function * generator() {
	yield Promise.resolve(result);
	yield Promise.reject(error);
}

// ✅
async function * generator() {
	yield result;
	throw error;
}
```

```js
// ❌
promise
	.then(x => {
		if (x % 2 == 0) {
			return Promise.resolve(x / 2);
		}

		return Promise.reject(new Error('odd number'));
	})
	.catch(error => Promise.reject(new FancyError(error)));

// ✅
promise
	.then(x => {
		if (x % 2 == 0) {
			return x / 2;
		}

		throw new Error('odd number');
	});
	.catch(error => {
		throw new FancyError(error);
	});
```

```js
// ❌
promise.finally(() => Promise.reject(new Error('oh no')));

// ✅
promise.finally(() => {
	throw new Error('oh no');
});
```
