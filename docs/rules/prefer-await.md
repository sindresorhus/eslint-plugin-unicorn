# Prefer using `await` operator over `Promise#{then,catch,finally}()`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Prefer using [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await) operator over [`Promise#then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then), [`Promise#catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch) and [`Promise#finally()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/finally), which is easier to write and to read afterwards.

## Fail

```js
promise.then(result => foo(result));
```

```js
promise.then(error => foo(error));
```

```js
promise.finally(() => foo());
```

```js
promise
	.then(result => foo(result))
	.catch(error => bar(error))
	.finally(() => baz());
```

## Pass

```js
const result = await promise;
foo(result);
```

```js
try {
  await promise;
} catch (error) {
  foo(error);
}
```

```js
try {
  await promise;
} finally {
  foo();
}
```

```js
let result;

try {
  result = await promise;
} catch (error) {
  bar(error);
} finally {
  baz();
}

foo(result);
```
