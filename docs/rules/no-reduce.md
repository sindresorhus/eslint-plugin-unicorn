# Disallow the usage of Array#reduce

`Array.reduce` usually results in hard-to-read code. It can almost every time by replaced fith `.map`, `.filter`. Only in the rare case of summing up the array it is useful.

Use `eslint-disable` comment if you really need to use it.

This rule is not fixable.

## Fail

```js
const arr = [1, 2, 3, 4];

arr.reduce((acc, n) => {
	if (n > 2) acc = [...acc, n];
	return acc;
}, []);
```

## Pass

```js
const arr = [1, 2, 3, 4];

arr.filter((n) => n > 2);
```
