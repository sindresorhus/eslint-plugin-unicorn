# Do not include spaces in `console.log` parameters.

[`console.log`](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods insert spaces between messages.


## Fail

```js
console.log('abc ');
console.warn('abc ');
console.error('abc ');

console.log('abc ', 'def');
console.log('abc', ' def');

console.log('abc\t', 'def');
console.log('abc\n', 'def');
```


## Pass

```js
console.log('abc');
console.log('abc', 'def');

console.log(`abc `);
console.log(`abc\t`);
console.log(`abc\n`);
console.log(`
	abc
`);
```
