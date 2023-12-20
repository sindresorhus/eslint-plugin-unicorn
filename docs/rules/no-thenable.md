# Disallow `then` property

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

If an object is defined as "thenable", once it's accidentally used in an await expression, it may cause problems:

```js
const foo = {
	unicorn: 1,
	then() {},
};

const {unicorn} = await foo;

console.log('after'); //<- This will never execute
```

```js
const foo = {
	unicorn: 1,
	then() {
		throw new Error('You shouldn’t have called me')
	},
};

const {unicorn} = await foo;
// Error: You shouldn’t have called me
```

If a module has an export named `then`, dynamic `import()` may not work as expected:

```js
// foo.js

export function then () {
	throw new Error('You shouldn’t have called me')
}
```

```js
// bar.js

const foo = await import('./foo.js');
// Error: You shouldn’t have called me
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
