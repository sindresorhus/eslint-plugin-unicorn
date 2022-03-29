# Forbid unreadable IIFEs

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*
<!-- /RULE_NOTICE -->

IIFE with parenthesized arrow function body is considered unreadable.

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
