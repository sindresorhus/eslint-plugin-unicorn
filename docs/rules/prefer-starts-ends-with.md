# Prefer `.startsWith` and `.endsWith` 

To know whether a string starts or ends, you have several methods, such as `string.indexOf('foo') === 0` or using regexes with `/^foo/` or `/foo$/`. ES2015 introduces simpler alternatives named `.startsWith` and `.endsWith`. This rule enforces the use of those whenever possible.


## Fail

```js
/^bar/.test(foo);
/bar$/.test(foo);
```


## Pass

```js
foo.startsWith('bar');
foo.endsWith('bar');
```
