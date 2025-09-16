# Disallow member access from await expression

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When accessing a member from an await expression, the await expression has to be parenthesized, which is not readable.

This rule is fixable for simple member access.

## Examples

```js
// ❌
const foo = (await import('./foo.js')).default;

// ✅
const {default: foo} = await import('./foo.js');
```

```js
// ❌
const secondElement = (await getArray())[1];

// ✅
const [, secondElement] = await getArray();
```

```js
// ❌
const property = (await getObject()).property;

// ✅
const {property} = await getObject();
```

```js
// ❌
const data = await (await fetch('/foo')).json();

// ✅
const response = await fetch('/foo');
const data = await response.json();
```
