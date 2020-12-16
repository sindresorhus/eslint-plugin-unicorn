# Prefer [`Array#indexOf()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf) over [`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) when looking for the index of an item

[`Array#findIndex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) is made for more complex criteria. If you are just looking for the index where a given object is present, then the code can be reduced. It concerns any search with a literal, a variable or any expression that hasn't any side effect. However, if the expression you are looking for has side effect, relies on element related to the function (the name of the function, its arguments...), the case is still valid.

This rule is partly fixable.

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
