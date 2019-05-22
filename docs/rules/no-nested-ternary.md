# Disallow nested ternary expressions

Nesting ternary expressions can make code more difficult to understand.

One level of nesting is allowed as long as the nested ternary is wrapped in parens

## Fail

```js
var foo = i > 5 ? i < 100 ? true : false : true;
var foo = i > 5 ? true : (i < 100 ? true : (i < 1000 ? true : false));
```


## Pass

```js
var foo = i > 5 ? (i < 100 ? true : false) : true;
var foo = i > 5 ? (i < 100 ? true : false) : (i < 100 ? true : false);
```
