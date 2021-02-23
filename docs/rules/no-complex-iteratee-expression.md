# Move complex iteratee expressions outside of `for..of` headers

Having complex expressions inside of `for..of` headers damages the readability and can lengthen the line. You should extract it to a constant variable before the `for` loop, and use that variable as the iteratee.

This rule disallowes function calls with arguments in the iteratee slot of the for loop, except for a few common built-in methods such as `Object.keys()`, `Object.values()` and `Object.entries()`.

This rule is fixable.

## Fail

```js
for (const value of array.filter(element => shouldKeep(element))) {
	console.log(value);
}
```

```js
for (const value of functionCall(variable1, variable2, variable3)) {
	console.log(value);
}
```

## Pass

```js
for (const value of obj.property) {
	console.log(value);
}
```

```js
for (const value of obj.method()) {
	console.log(value);
}
```

```js
for (const [key, value] of Object.entries(obj)) {
	console.log(key, value);
}
```
