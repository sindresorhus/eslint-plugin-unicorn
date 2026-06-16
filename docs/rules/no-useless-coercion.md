# no-useless-coercion

📝 Disallow useless type coercions of values that are already of the target type.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling `Boolean()`, `String()`, `Number()`, or `BigInt()` on a value that is already of that type is a no-op. It adds noise and can hide the author's intent.

This includes redundant double coercion, like `String(String(value))`, and coercing an expression whose type is already known, like `Boolean(a === b)` or `Number(array.length)`.

The check is syntactic, so it catches the common cases without type information, and uses TypeScript type information when it is available.

This rule only flags the coercion functions. For redundant wrapper callbacks like `array.map(x => String(x))`, see [`prefer-native-coercion-functions`](./prefer-native-coercion-functions.md). For `Boolean()` casts inside array predicate callbacks, see [`no-useless-boolean-cast`](./no-useless-boolean-cast.md).

## Examples

```js
// ❌
const a = Boolean(true);
// ❌
const b = String('hello');
// ❌
const c = Number(42);
// ❌
const d = BigInt(1n);

// ✅
const a = true;
// ✅
const b = 'hello';
// ✅
const c = 42;
// ✅
const d = 1n;
```

```js
// ❌ Double coercion
const a = String(String(value));
// ❌ Already a boolean
const b = Boolean(a === b);
// ❌ Already a number
const c = Number(array.length);

// ✅
const a = String(value);
// ✅
const b = a === b;
// ✅
const c = array.length;
```

```js
// ✅ Genuine conversions are left alone
const a = Boolean(1);
const b = String(123);
const c = Number('5');
const d = BigInt(5);
```
