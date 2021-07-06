# Disallow useless spread

The spread syntax in following cases are useless:

- Spread array literal as elements of array literal
- Spread array literal as arguments of call or new call
- Spread object literal as properties of object literal

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
