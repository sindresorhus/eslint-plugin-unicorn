# max-nested-calls

📝 Limit the depth of nested calls.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Deeply nested calls make code hard to read. Extract intermediate results to named variables instead.

This rule counts calls passed into other calls. Fluent receiver chains are ignored.

## Examples

```js
// ❌
foo(bar(baz(qux())));

// ✅
const value = baz(qux());
foo(bar(value));
```

```js
// ✅
query().filter().map().toArray();
```

## Options

### max

Type: `number`\
Default: `3`

The maximum allowed nested call depth.

```js
/* eslint unicorn/max-nested-calls: ["error", {"max": 4}] */
// ✅
foo(bar(baz(qux())));
```
