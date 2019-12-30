# Prefer the exponentiation operator over `Math.pow()`

**This rule is deprecated. Use the built-in ESLint [`prefer-exponentiation-operator`](https://eslint.org/docs/rules/prefer-exponentiation-operator) rule instead.**

Enforces the use of the [exponentiation operator](http://2ality.com/2016/02/exponentiation-operator.html) over [`Math.pow()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow).

This rule is fixable.


## Fail

```js
Math.pow(2, 4);
```


## Pass

```js
2 ** 4
```
