# Disallow returning/yielding `Promise.resolve/reject()` in async functions

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

Wrapping a return value in `Promise.resolve` in an async function is unnecessary as all return values of an async function are already wrapped in a `Promise`. Similarly, returning an error wrapped in `Promise.reject` is equivalent to simply `throw`ing the error.

This is the same for `yield`ing in async generators as well.

## Fail

```js
const main = async foo => {
	if (foo > 4) {
		return Promise.reject(new Error('🤪'));
	}

	return Promise.resolve(result);
};

async function * generator() {
	yield Promise.resolve(result);
	yield Promise.reject(error);
}
```

## Pass

```js
const main = async foo => {
	if (foo > 4) {
		throw new Error('🤪');
	}

	return result;
};

async function * generator() {
	yield result;
	throw error;
}
```
