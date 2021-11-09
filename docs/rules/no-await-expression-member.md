# Forbid member access from await expression

When accessing member from await expression, the await expression has to be parenthesized, which is not readable.

This rule is fixable for member access.

## Fail

```js
const foo = (await import('./foo.js')).default;
```

```js
const secondElement = (await getArray())[1];
```

```js
const property = (await getObject()).property;
```

```js
const data = await (await fetch('/foo')).json();
```

## Pass

```js
const {default: foo}= await import('./foo.js');
```

```js
const [, secondElement] = await getArray();
```

```js
const {property} = await getObject();
```

```js
const response = await fetch('/foo');
const data = await response.json();
```
