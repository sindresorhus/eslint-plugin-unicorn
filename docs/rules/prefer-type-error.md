# Enforce throwing `TypeError` in type checking conditions

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

This rule enforces you to throw a `TypeError` after a type checking if-statement, instead of a generic `Error`.

It's aware of the most commonly used type checking operators and identifiers like `typeof`, `instanceof`, `.isString()`, etc, borrowed from [ES2017](https://tc39.github.io/ecma262/), [Underscore](https://underscorejs.org), [Lodash](https://lodash.com), and [jQuery](https://jquery.com). For a complete list of the recognized identifiers, please take a look at the [identifier-definition](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/rules/prefer-type-error.js#L3).

The rule investigates every throw-statement which throws a generic `Error`. It will fail if the throw-statement is the only expression in the surrounding block and is preceeded by an if-statement whose condition consists of type-checks exclusively. You have to replace the `Error` with a `TypeError`.


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
if (isNaN(foo) === false) {
	throw new Error('Number expected');
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
if (isNaN(foo) === false) {
	throw new TypeError('Number expected');
}
```

```js
if (typeof foo !== 'function' &&
	foo instanceof CookieMonster === false &&
	foo instanceof Unicorn === false) {
	throw new TypeError('Magic expected');
}
```
