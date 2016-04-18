# Require a specific parameter name in catch clauses.

Applies to both `try/catch` clauses and `promise.catch(...)` handlers.

The desired name is configurable, but defaults to `err`.

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
