# Enforce a TypeError after a type checking If-Statement

This rule enforces you to throw a TypeError after a type checking if-statement, instead of a less specific Error-object.

It is aware of the most commonly used type checking operators and identifiers like `typeof`, `instanceof`, `.isString()` etc. borrowed from the [ES 2017](https://tc39.github.io/ecma262/), [underscore](http://underscorejs.org/), [lodash](https://lodash.com/) and [jQuery](https://jquery.com/). For a complete list of the recognized identifiers, please take a look to the  [identifier-definition](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/master/rules/type-error.js#L3).

The rule investigates every throw-statement which throws a basic Error-object. The check will fail if the throw-statement is preceeded by an if-statement whose condition consists of type-checks exclusively.

In order to fix that issue you have to replace the Error-object by a TypeError-object. Fortunately, this rule is able to `--fix` it for you.

## Fail

```js
if (Array.isArray(foo) === false) {
	throw new Error('Array expected');
}
```

```js
if (Number.isNaN(foo) === false && Number.isInteger(foo) === false) {
	throw new Error('Integer expected');
}
```

```js
if (typeof foo !== 'function' &&
	foo instanceof CookieMonster === false &&
	foo instanceof Unicorn === false) {
	throw new Error('Magic expected');
}
```

## Pass

```js
if (Array.isArray(foo) === false) {
	throw new TypeError('Array expected');
}
```

```js
if (Number.isNaN(foo) === false && Number.isInteger(foo) === false) {
	throw new TypeError('Integer expected');
}
```

```js
if (typeof foo !== 'function' &&
	foo instanceof CookieMonster === false &&
	foo instanceof Unicorn === false) {
	throw new TypeError('Magic expected');
}
```
