# prefer-string-coercion

📝 Prefer `String()` for decimal string conversion of numbers.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `String(value)` for zero-argument `.toString()` calls on known `number` or `bigint` values, including `number | bigint` unions. The rule checks dot notation and bracket notation with a string literal or a template literal without substitutions.

Calls with a radix argument, explicit type arguments, or optional chaining to the receiver or method are allowed. Use type-checked linting for generic type aliases, intersections, inferred TypeScript property types, unresolved annotations, and inline JSDoc casts. With type information, the rule only reports calls that return plain `string`.

The rule skips edits that would remove a comment or detach inline JSDoc from its expression.

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
