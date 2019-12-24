# Prefer `String.prototype.replaceAll` over regex searches with the global flag.

As the replaceAll method is being added to strings, there is no reason to use expensive regex searches when the search string is a string-literal.

This rule is fixable.


## Fail

```js
str.replace(/This has no special regex symbols/g, 'something');
str.replace(/\(It also checks for escaped regex symbols\)/g, 'something');

```


## Pass

```js
str.replace(/Non-literal characters .*/g, 'something');
str.replace(/Extra flags/gi, 'something');
str.replace('Not a regex expression', 'something')
str.replaceAll('literal characters only', 'something');
```
