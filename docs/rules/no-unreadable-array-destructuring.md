# Disallow unreadable array destructuring

Destructuring is very useful, but it can also make some code harder to read. This limits the abusive ignoring consecutive values when destructuring from array.

## Fail

```js
const [,, foo] = parts;
const [,,, foo] = parts;
const [,,,, foo] = parts;
const [,,...rest] = parts;
```

## Pass

```js
const [, foo] = parts;
const [foo] = parts;
const foo = parts[3];
const [,...rest] = parts;
```

## Worth to know

You might have to modify the built-in [prefer-destructuring](https://eslint.org/docs/rules/prefer-destructuring) rule to be compatible with this one. In that case you can do it like this:

```js
{
  "rules": {
    "prefer-destructuring": ["error", {"object": true, "array": false}]
  }
}
```
