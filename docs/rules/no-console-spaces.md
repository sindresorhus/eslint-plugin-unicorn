# Do not use leading/trailing space between `console.log` parameters

The [`console.log()` method](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods joins the parameters with a space, so adding a leading/trailing space to a parameter, results in two spaces being added.

This rule is fixable.


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
