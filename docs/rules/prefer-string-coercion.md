# prefer-string-coercion

📝 Prefer `String()` for decimal string conversion of numbers and BigInts.

🚫 Disabled by default.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use `String(value)` for decimal conversion of a `number` or `bigint`. The rule checks calls with no arguments when it can identify the receiver as numeric, including a `number | bigint` union. It recognizes `value.toString()` and bracket notation with a static string such as `value['toString']()`. Calls with an explicit radix or optional chaining to the receiver or method are allowed.

The replacement is an editor suggestion because an inferred type can differ from the runtime value. For example, an out-of-bounds array read can return `undefined` even when TypeScript infers `number`. In that case, `.toString()` throws and `String(value)` returns `'undefined'`.

A local declaration or import named `String` suppresses the suggestion.

## Examples

```js
// ❌
const label = (42).toString();

// ✅
const label = String(42);
```

```js
// ❌
const id = (123n).toString();

// ✅
const id = String(123n);
```

```js
// ✅
const hex = (255).toString(16);
```

```js
// ✅
const text = url.toString();
```
