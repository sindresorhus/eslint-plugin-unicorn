# no-useless-boolean-cast

📝 Disallow unnecessary `Boolean()` and `!!` casts in array predicate callbacks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Array predicate methods already treat callback return values as truthy or falsy, so wrapping the returned expression in `Boolean()` or applying double negation (`!!`) is unnecessary.

The rule checks arrays and typed arrays. It skips receivers known to be neither. It checks direct returns from block callbacks and calls that use optional chaining or a string literal or template literal without substitutions as the method name.

The rule keeps casts around optional chains in the returned value because the cast converts a possibly `undefined` value to a boolean. With [type information](https://typescript-eslint.io/getting-started/typed-linting/), it also keeps casts of values whose type includes `undefined`, `null`, or `void`.

The rule keeps a cast when the operand cannot satisfy a required return type or when JSDoc annotates the callback or returned expression with `@type` or `@satisfies`. In TypeScript and JavaScript with type annotations, it offers a suggestion when removing a cast could change inferred narrowing or when it has insufficient type information to verify the change.

The rule keeps `Boolean()` calls with explicit type arguments because the type argument can supply the operand's type. In typed files without type information, the rule requires a known standard array before it can remove a cast around a non-boolean return from `find` or `findIndex`.

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
