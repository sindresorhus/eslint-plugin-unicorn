# Prefer the nullish coalescing operator(`??`) over the logical OR operator(`||`)

The [nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) only coalesces when the value is `null` or `undefined`, it is safer than [logical OR operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)  which coalesces on any [falsy value](https://developer.mozilla.org/en-US/docs/Glossary/Falsy).

## Fail

```js
const foo = bar || value;
```

```js
foo ||= value;
```

```js
if (foo || value) {}
```

## Pass

```js
const foo = bar ?? value;
```

```js
foo ??= value;
```
