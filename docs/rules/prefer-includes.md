# Prefer `.includes()` over `.indexOf()` when checking for existence

The rule assume all properties named `.indexOf()` have a `.includes()` counterpart, as ESLint doesn't do type analysis. This is luckily true for all built-ins: `String#includes`, `Array#includes`, `TypedArray#includes`, `Buffer#includes`.


## Fail

```js
const x = 'foobar';

x.indexOf('foo') !== -1;
x.indexOf('foo') != -1;
x.indexOf('foo') > -1;
x.indexOf('foo') >= 0;
```

```js
const x = 'foobar';

!x.includes === -1;
!x.includes == -1;
!x.includes < 0;
```


## Pass

```js
const x = 'foobar';

x.includes('foo');
```
