# Enforce using the separator argument with `Array#join()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

It's better to make it clear what the separator is when calling [Array#join()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join), instead of relying on the default comma (`','`) separator.

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
