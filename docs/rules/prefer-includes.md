# Prefer .includes() over .indexOf() when checking for existence.

Since ESLint has no type analysis we'll have to assume all properties named .indexOf() have a .includes() counterpart.

This is luckily true for all builtins: String#includes, Array#includes, TypedArray#includes, Buffer#includes.


## Fail

```js
const str = 'foobar';

str.indexOf('foo') !== -1
str.indexOf('foo') != -1
str.indexOf('foo') > -1
str.indexOf('foo') >= 0
```

```js
const str = 'foobar';

!str.includes === -1
!str.includes == -1
!str.includes < 0
```

```js
const str = 'foobar';

/foo/.test(str);
```


## Pass

```js
const str = 'foobar';

str.includes('foo')
```

TODO:

Would also be useful to catch cases where .includes() would be better than a regex:

```js
/\r\n/.test(foo);
```

Could be:

```js
foo.includes('\r\n');
```
