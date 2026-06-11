# no-error-property-assignment

📝 Disallow assigning to built-in error properties.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow assigning to built-in error metadata after the error has been constructed.

The built-in `Error` constructors initialize and expose properties such as `name`, `stack`, `cause`, and `AggregateError#errors` as part of the error object. Overwriting them later can make logs, stack traces, or error handling misleading. Pass constructor-supported data when constructing the error, or use an application-specific property instead.

This rule intentionally only checks error values that are syntactically known to be built-in errors. It does not infer unknown variables named `error` or custom error subclasses.

## Examples

```js
// ❌
Object.assign(new Error('message'), {name});

// ❌
const error = new Error('message');
error.stack = stack;

// ❌
Object.assign(new AggregateError(errors, 'message'), {errors});
```

```js
// ✅
Object.assign(error, {name});

// ✅
Object.assign(new Error('message'), {code});

// ✅
const error = new Error('message');
error.message = message;
```
