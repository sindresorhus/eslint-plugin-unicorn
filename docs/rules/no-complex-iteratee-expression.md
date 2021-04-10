# Move complex iteratee expressions outside of `for..of` headers

Having complex expressions inside of `for..of` headers damages the readability and can lengthen the line. You should extract it to a constant variable before the `for` loop, and use that variable as the iteratee.

This rule enforces you to use only variables, array literals or function calls with no arguments as the iteratee expression, and to move other complex expression such as function calls with multiple arguments in a new variable.

This rule is partly fixable.

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
const values = array.filter(element => shouldKeep(element))
for (const value of values) {
	console.log(value);
}
```

```js
for (const [key, value] of Object.entries(obj)) {
	console.log(key, value);
}
```
