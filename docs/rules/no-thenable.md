# Disallow `then` property

If an object is defined as "thenable", once it's accidentally used in an await expression, it may cause problems.

If a module have exported `then`, dynamic `import()` may won't works as expected.

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
class {
	then() {}
}
```

```js
class {
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
class {
	success() {}
}
```

```js
const foo = bar.then;
```
