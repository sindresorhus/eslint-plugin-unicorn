# Disallow unreadable IIFEs

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[IIFE](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression) with parenthesized arrow function body is considered unreadable.

## Fail

```js
const foo = (bar => (bar ? bar.baz : baz))(getBar());
```

```js
const foo = ((bar, baz) => ({bar, baz}))(bar, baz);
```

## Pass

```js
const bar = getBar();
const foo = bar ? bar.baz : baz;
```

```js
const getBaz = bar => (bar ? bar.baz : baz);
const foo = getBaz(getBar());
```

```js
const foo = (bar => {
	return bar ? bar.baz : baz;
})(getBar());
```
