# Disallow useless spread

Using spread syntax in the following cases is unnecessary:

- Spread an array literal as elements of an array literal
- Spread an array literal as arguments of a call or a `new` call
- Spread an object literal as properties of an object literal

This rule is fixable.

## Fail

```js
const array = [firstElement, ...[secondElement], thirdElement];
```

```js
const object = {firstProperty, ...{secondProperty}, thirdProperty};
```

```js
foo(firstArgument, ...[secondArgument], thirdArgument);
```

```js
const object = new Foo(firstArgument, ...[secondArgument], thirdArgument);
```

## Pass

```js
const array = [firstElement, secondElement, thirdElement];
```

```js
const object = {firstProperty, secondProperty, thirdProperty};
```

```js
foo(firstArgument, secondArgument, thirdArgument);
```

```js
const object = new Foo(firstArgument, secondArgument, thirdArgument);
```

```js
const array = [...foo, bar];
```

```js
const object = {...foo, bar};
```

```js
foo(foo, ...bar);
```

```js
const object = new Foo(...foo, bar);
```
