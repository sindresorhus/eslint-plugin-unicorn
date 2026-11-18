# prefer-string-coercion

📝 Prefer `String()` for decimal string conversion of numbers and BigInts.

🚫 Disabled by default.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use `String(value)` for decimal conversion of a `number` or `bigint`. The rule checks calls with no arguments when it can identify the receiver as numeric, including a `number | bigint` union. It recognizes dot notation and bracket notation with a string literal or an expression-free template literal. Calls with an explicit radix or optional chaining to the receiver or method are allowed.

The rule recognizes numeric operations and known built-ins such as `Date.now()`. Type information or a statically known value can also establish that an instance method or property produces a number or BigInt. With type-checked linting, the rule checks that `.toString()` returns plain `string` before reporting.

The replacement is an editor suggestion because an inferred type can differ from the runtime value. For example, TypeScript can infer `number` for an out-of-bounds array read or for a value that can be `undefined` when `strictNullChecks` is disabled. If the value is `undefined`, `.toString()` throws and `String(value)` returns `'undefined'`.

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
