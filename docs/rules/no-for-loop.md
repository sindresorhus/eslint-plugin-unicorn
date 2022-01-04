# Do not use a `for` loop that can be replaced with a `for-of` loop

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

There's no reason to use old school for loops anymore for the common case. You can instead use for-of loop (with `.entries()` if you need to access the index).

Off-by-one errors are one of the most common bugs in software. [Swift actually removed this completely from the language.](https://github.com/apple/swift-evolution/blob/master/proposals/0007-remove-c-style-for-loops.md).

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
