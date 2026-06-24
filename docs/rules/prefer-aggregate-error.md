# prefer-aggregate-error

📝 Prefer `AggregateError` when throwing multiple collected errors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces using [`AggregateError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError) when a collected `Error` array is checked before throwing a generic `Error`.

`AggregateError` keeps the collected errors available on the thrown error instead of losing them behind a summary message.

The rule intentionally targets only direct guarded throws where the collection name clearly refers to errors and the error collection is evident from TypeScript annotations or type information. More indirect collection flow is ignored.

## Examples

```ts
// ❌
const errors: Error[] = [new Error('Email is required.')];

if (errors.length > 0) {
	throw new Error('Validation failed.');
}

// ✅
const errors: Error[] = [new Error('Email is required.')];

if (errors.length > 0) {
	throw new AggregateError(errors, 'Validation failed.');
}
```

```ts
// ❌
const validationErrors: TypeError[] = [new TypeError('Invalid email.')];

if (validationErrors.length !== 0) {
	throw new Error('Validation failed.', {cause});
}

// ✅
const validationErrors: TypeError[] = [new TypeError('Invalid email.')];

if (validationErrors.length !== 0) {
	throw new AggregateError(validationErrors, 'Validation failed.', {cause});
}
```
