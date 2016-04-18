# Require a specific parameter name in catch clauses.

This is a style rule that ensures a certain parameter name is used for catch clauses and as the first parameter of promise catch handlers.

The desired name is configurable, by defaults to `err`.

## Fail

```js
try {
  doSomething();
} catch (error) {
  // ...
}
```

```js
somePromise.catch(e => {})
```


## Pass

```js
try {
  doSomething();
} catch (err) {
  // ...
}
```

```js
somePromise.catch(err => {})
```

```js
try {
  doSomething();
} catch (anyName) { // Nesting of catch clauses disables the rule.
  try {
    doSomethingElse();
  } catch (anyOtherName) {
    // ...
  }
}
```

## Options

You can set the option in configuration like this:

```js
"xo/catch-error-name": ["error", {"name": "err"}]
```
