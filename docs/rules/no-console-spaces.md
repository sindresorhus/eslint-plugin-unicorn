# Do not use leading/trailing space between `console.log` parameters

[`console.log`](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods insert spaces between messages.


## Fail

```js
console.log('abc ', 'def');
console.log('abc', ' def');

console.log("abc ", " def");
console.log(`abc `, ` def`);

console.debug('abc ', 'def');
console.info('abc ', 'def');
console.warn('abc ', 'def');
console.error('abc ', 'def');
```


## Pass

```js
console.log('abc');
console.log('abc', 'def');

console.log('abc ');
console.log(' abc');

console.log('abc  ', 'def');
console.log('abc\t', 'def');
console.log('abc\n', 'def');

console.log(`
	abc
`);
```
