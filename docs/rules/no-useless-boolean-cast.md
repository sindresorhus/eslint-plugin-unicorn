# no-useless-boolean-cast

📝 Disallow unnecessary `Boolean()` casts in array predicate callbacks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Array predicate methods already treat callback return values as truthy or falsy, so wrapping the returned expression in `Boolean()` is unnecessary.

`Boolean()` around an optional chain is kept, since it normalizes a possibly-`undefined` value to a real boolean. When [type information](https://typescript-eslint.io/getting-started/typed-linting/) is available, the cast is also kept whenever the argument's type includes `undefined` or `null`, even without optional-chaining syntax.

## Examples

```js
// ❌
const enabledRecords = records.filter(record => Boolean(record.enabled));

// ✅
const enabledRecords = records.filter(record => record.enabled);
```

```js
// ❌
const hasEnabledRecord = records.some(record => Boolean(record.enabled));

// ✅
const hasEnabledRecord = records.some(record => record.enabled);
```

```js
// ❌
const allRecordsAreEnabled = records.every(record => Boolean(record.enabled));

// ✅
const allRecordsAreEnabled = records.every(record => record.enabled);
```

```js
// ✅
const toBoolean = value => Boolean(value);
```

```js
// ✅ `Boolean()` normalizes a possibly-`undefined` value from optional chaining
const hasMatch = records.some(record => Boolean(record.get('name')?.includes('x')));
```
