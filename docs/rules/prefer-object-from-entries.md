# Prefer use `Object.fromEntries(…)` to transform a list of key-value pairs into an object

When transforming a list of key-value pairs into an object, `Object.fromEntries(…)` should be preferred.

This rule is fixable for simple cases.

## Fail

```js
const object = pairs.reduce(
	(object, [key, value]) => ({...object, [key]: value}),
	{}
);
```

```js
const object = pairs.reduce(
	(object, [key, value]) => ({...object, [key]: value}),
	Object.create(null)
);
```

```js
const object = pairs.reduce(
	(object, [key, value]) => Object.assign(object, {[key]: value}),
	{}
);
```

```js
const object = pairs.reduce(addPairToObject, {});
```

## Pass

```js
const object = Object.fromEntries(pairs);
```

```js
const object = new Map(pairs);
```
