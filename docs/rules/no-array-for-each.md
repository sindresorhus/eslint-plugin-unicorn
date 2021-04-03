# Prefer `for…of` over `Array#forEach(…)`

Benefits of [`for…of` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) over [`Array#forEach(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) can include:

- Faster
- Better readability
- Ability to exit early with `break` or `return`

This rule is partly fixable.

## Fail

```js
array.forEach(element => {
	bar(element);
});
```

```js
array.forEach((element, index) => {
	bar(element, index);
});
```

```js
array.forEach((element, index, array) => {
	bar(element, index, array);
});
```

## Pass

```js
for (const element of array) {
	bar(element);
}
```

```js
for (const [index, element] of array.entries()) {
	bar(element, index);
}
```

```js
for (const [index, element] of array.entries()) {
	bar(element, index, array);
}
```
