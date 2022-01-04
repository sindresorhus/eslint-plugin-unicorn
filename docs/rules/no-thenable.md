# Disallow `then` property

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*
<!-- RULE_NOTICE_END -->

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
