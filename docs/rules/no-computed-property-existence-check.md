# no-computed-property-existence-check

📝 Disallow dynamic object property existence checks.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Dynamic property access and the [`in` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in) check inherited properties too. This can make values like `constructor` and `toString` look present even when the object does not define them.

Use [`Object.hasOwn()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn) when you need to check whether an object has its own property. Prefer `Map#has()` or `Set#has()` when the value is really a lookup table.

## Examples

```js
// ❌
if (object[key]) {}

// ❌
if (key in object) {}

// ✅
if (object[key] === true) {}

// ✅
if (Object.hasOwn(object, key)) {}
```

```js
// ✅
const value = object[key];

// ✅
if ('key' in object) {}

// ✅
if (object['key']) {}
```
