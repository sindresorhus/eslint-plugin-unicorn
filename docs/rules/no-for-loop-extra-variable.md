# Do not use an extra variable in a `for` loop that is only used for the test

A pattern in some codebases is to define a second variable in the initial state which is then only used in the test condition. This variable is unecessary and prevents the no-for-loop from flagging the loop.

In the case where the second variable is used either inside the loop or is defined with `var` and used elsewhere in the code, it often makes more sense to define 

This rule is fixable unless the variable is used inside the loop.


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
