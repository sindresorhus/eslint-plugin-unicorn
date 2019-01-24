# Prefer `.includes()` over `.indexOf()` when checking for existence

The rule assume some properties named `.indexOf()` have a `.includes()` counterpart, as ESLint doesn't do type analysis. This is luckily true for all built-ins: `String#includes`, `Array#includes`, `TypedArray#includes`, `Buffer#includes`.

This rule is fixable.

## Fail

```js
[].indexOf('foo') !== -1;
x.indexOf('foo') != -1;
str.indexOf('foo') > -1;
'foobar'.indexOf('foo') >= 0;
x.indexOf('foo') === -1
```

## Pass

```js
const x = 'foobar';
str.indexOf('foo') !== -n;
str.indexOf('foo') !== 1;
!str.indexOf('foo') === 1;
!str.indexOf('foo') === -n;
str.includes('foo');
[1,2,3].includes(4);
```
