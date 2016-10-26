# Prefer `String#startsWidth` & `String#endsWidth` over more complex alternatives

To know whether a string starts or ends, you have several methods, such as `string.indexOf('foo') === 0` or using regexes with `/^foo/` or `/foo$/`. ES2015 introduces simpler alternatives named [`String#startsWith`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith). This rule enforces the use of those whenever possible.


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
