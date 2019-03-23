# Prefer `.includes()` over `.indexOf()` when checking for existence or non-existence

All built-ins have `.includes()` in addition to `.indexOf()`. Prefer `.includes()` over comparing the value of `.indexOf()`

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
