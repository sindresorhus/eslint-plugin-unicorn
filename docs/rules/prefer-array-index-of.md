# Prefer `Array#indexOf()` over `Array#findIndex()` when searching the index of an item

All built-ins have [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf) in addition to [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex). Prefer `Array#indexOf()` over use of `Array#findIndex()` passing a function that tests equality as parameter

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
