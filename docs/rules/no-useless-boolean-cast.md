# no-useless-boolean-cast

📝 Disallow unnecessary `Boolean()` and `!!` casts in array predicate callbacks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Array predicates already test truthiness. The rule checks `Boolean()` and `!!` in inline first-argument callbacks on arrays and typed arrays.

It keeps `Boolean()` calls with type arguments, casts of optional-chain results, and casts with JSDoc `@type` or `@satisfies` on the cast or callback. With [type information](https://typescript-eslint.io/getting-started/typed-linting/), it skips custom signatures and operands that may be `null`, `undefined`, or `void`.

Explicit return annotations, including `@returns` in JavaScript, require a known boolean operand. The rule suggests edits when narrowing might change. In typed code without type information, removing a cast from a non-boolean `find` or `findIndex` return requires a known standard array.

## Examples

```js
// ❌
const enabledRecords = records.filter(record => Boolean(record.enabled));

// ✅
const enabledRecords = records.filter(record => record.enabled);
```

```js
// ❌
const hasEnabledRecord = records?.some(record => !!record.enabled);

// ✅
const hasEnabledRecord = records?.some(record => record.enabled);
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
