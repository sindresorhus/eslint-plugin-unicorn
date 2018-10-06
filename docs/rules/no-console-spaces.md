# Do not use leading/trailing space in `console.log` parameters

[`console.log`](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods insert spaces between messages.


## Fail

```js
console.log('abc ');
console.log("abc ");
console.log(`abc `);

console.log('abc ', 'def');
console.log('abc', ' def');

console.debug('abc ');
console.info('abc ');
console.warn('abc ');
console.error('abc ');
```


## Pass

```js
console.log('abc');
console.log('abc', 'def');

console.log('abc  ', 'def');
console.log('abc\t', 'def');
console.log('abc\n', 'def');

console.log(`abc\t`);
console.log(`abc\n`);
console.log(`
	abc
`);
```
