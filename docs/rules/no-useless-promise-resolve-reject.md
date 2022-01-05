# Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

Wrapping a return value in `Promise.resolve` in an async function or a `Promise#then`/`catch`/`finally` callback is unnecessary as all return values in async functions and promise callback functions are already wrapped in a `Promise`. Similarly, returning an error wrapped in `Promise.reject` is equivalent to simply `throw`ing the error. This is the same for `yield`ing in async generators as well.

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

promise
	.then(x => {
		if (x % 2 == 0) {
			return Promise.resolve(x / 2);
		}

		return Promise.reject(new Error('odd number'));
	});
	.catch(error => Promise.reject(new FancyError(error)));

promise.finally(() => Promise.reject(new Error('oh no')));
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

promise.finally(() => {
	throw new Error('oh no');
});
```
