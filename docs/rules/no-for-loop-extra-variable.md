# Do not declare an extra variable in a `for` loop setup

A pattern in some codebases is to declare a second variable in the initial state which is then only used in the test condition. This variable is unecessary and prevents the no-for-loop from flagging the loop.

In the case where the second variable is used either inside the loop or is defined with `var` and used elsewhere in the code, it often makes more sense to define the variable outside the loop so that the intent of the loop is easier to understand.

This rule is fixable unless the variable is defined using `let` and the same variable is used below the loop.


## Fail

```js
for(let i = 1, j=arr.length; i < j; i += 1) {
	const element = arr[i];
	console.log(element);
	}
```

```js
for(let i = 1, j=arr.length; i < j; i += 1) {
	const element = arr[i];
	console.log(element);
	console.log(j)
	}
```

## Pass

```js
for(let i = 1; i < arr.length; i += 1) {
	const element = arr[i];
	console.log(element);
	}
```

```js
let j=arr.length
for(let i = 1; i < j; i += 1) {
	const element = arr[i];
	console.log(element);
	console.log(j)
	}
```