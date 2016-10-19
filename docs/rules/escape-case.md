# Enforce escape sequences to use uppercase values

Enforces a convention of defining escape sequences with uppercase characters rather than lowercase ones.

## Fail

```js
var foo = "\xa9"
var foo = "\ud834"
var foo = "\u{1d306}"
var foo = "\ca"
```


## Pass

```js
var foo = "\xA9"
var foo = "\uD834"
var foo = "\u{1D306}"
var foo = "\cA"
```