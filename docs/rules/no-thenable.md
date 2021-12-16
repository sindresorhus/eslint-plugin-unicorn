# Disallow `then` property

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

If an object is defined as "thenable", once it's accidentally used in an await expression, it may cause problems.

```js
const foo = {
	unicorn: 1,
	then() {},
};
const {unicorn} = await foo;
console.log('after'); //<- This will nerve execute
```

```js
const foo = {
	unicorn: 1,
	then(callback) {
		callback();
	},
};
const {unicorn} = await foo;
// Uncaught TypeError: Cannot destructure property 'unicorn' ...
```

If a module has an export named `then`, dynamic `import()` may not work as expected.

```js
// foo.js
export const unicorn = 1;
export const then = callback => callback();

// bar.js
const {unicorn} = await import('./foo.js');
// Uncaught TypeError: Cannot destructure property 'unicorn' ...
```

## Fail

```js
export {then};
```

```js
const foo = {
	then() {}
};
```

```js
const foo = {
	get then() {}
};
```

```js
foo.then = function () {}
```

```js
class Foo {
	then() {}
}
```

```js
class Foo {
	static then() {}
}
```

## Pass

```js
export {then as success};
```

```js
const foo = {
	success() {}
};
```

```js
class Foo {
	success() {}
}
```

```js
const foo = bar.then;
```
