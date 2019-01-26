# Do not use for loop that can be replaced with a for-of loop

There's no reason to use old school for loops anymore for the common case. You can instead use for-of loop (with `.entries()` if you need to access the index).

This rule is fixable unless index or element variables were used outside of the loop.

## Fail

```js
for (let index = 0; index < array.length; index++) {
	const element = array[index];
	console.log(index, element);
}
```


## Pass

```js
for (const [index, element] of array.entries()) {
	console.log(index, element);
}

for (const element of array) {
	console.log(element);
}
```
