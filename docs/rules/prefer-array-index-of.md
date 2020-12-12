# Prefer [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf) over [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) when searching the index of an item

[`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) is made for more complex criteria.

This rule is fixable.

## Fail

```js
[].findIndex(x => x === 'foo');
values.findIndex(x => 'foo' === x);
values.findIndex(x => {return x === 'foo';});
['foobar'].findIndex(x => {return 'foo' === x;});
values.findIndex(function (x) {return x === 'foo';});
['foobar'].findIndex(function (x) {return 'foo' === x;});
```

## Pass

```js
[].findIndex(i => i === list[i]);
[].findIndex(x => x === 'foo' && isValid);
[].findIndex(x => y === 'foo');
[].findIndex(x => y.x === 'foo');
[].findIndex(x => x == 'foo');
['foobar'].findIndex(function (x) {return 'foo' == x;});
[].findIndex(x => x !== 'foo');
values.findIndex(function (x) {return x !== 'foo';});
```
