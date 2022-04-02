# Disallow member access from await expression

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

When accessing a member from an await expression, the await expression has to be parenthesized, which is not readable.

This rule is fixable for simple member access.

## Fail

```js
const foo = (await import('./foo.js')).default;
```

```js
const secondElement = (await getArray())[1];
```

```js
const property = (await getObject()).property;
```

```js
const data = await (await fetch('/foo')).json();
```

## Pass

```js
const {default: foo} = await import('./foo.js');
```

```js
const [, secondElement] = await getArray();
```

```js
const {property} = await getObject();
```

```js
const response = await fetch('/foo');
const data = await response.json();
```
