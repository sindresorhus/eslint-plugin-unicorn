# Enforce using the separator argument when concatenating elements in an array

Enforce using [the separator argument](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#parameters) when calling [Array#join()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join), it's more obvious what the separator is.

This rule is fixable.

## Fail

```js
const string = array.join();
```

```js
const string = Array.prototype.join.call(arrayLike);
```

```js
const string = [].join.call(arrayLike);
```

## Pass

```js
const string = array.join(',');
```

```js
const string = array.join('|');
```

```js
const string = Array.prototype.join.call(arrayLike, '');
```

```js
const string = [].join.call(arrayLike, '\n');
```
