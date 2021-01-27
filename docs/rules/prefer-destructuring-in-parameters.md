# Prefer destructuring in parameters over accessing properties

Makes your code shorter and nicer.

This rule is fixable.

## Fail

```js
const getObjectProperty = object => object.property;
```

```js
const removeEmptyValues = object => Object.fromEntries(
	Object.entries(object).filter(keyValuePair => Boolean(keyValuePair[1]))
);
```

## Pass

```js
const getFoo = ({property}) => property;
```

```js
const removeEmptyValues = object => Object.fromEntries(
	Object.entries(object).filter(([, value]) => Boolean(value))
);
```

```js
// Used property and index together
function foo(array) {
	if (array.length > 0) {
		return bar(array[0]);
	}
}
```
