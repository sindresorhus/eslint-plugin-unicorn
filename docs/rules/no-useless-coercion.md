# no-useless-coercion

📝 Disallow useless type coercions of values that are already of the target type.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling `Boolean()`, `String()`, `Number()`, or `BigInt()` on a value that is already of that type is a no-op. It adds noise and can hide the author's intent.

This includes redundant double coercion, like `String(String(value))`, and coercing an expression whose type is already known, like `Boolean(a === b)` or `Number(array.length)`.

It also flags the equivalent operator idioms when the value is already the target type: `!!value` (boolean), `+value` (number), `value + ''` and `'' + value` (string), and `value.toString()` (string).

The rule uses syntax and available TypeScript types. With `strictNullChecks`, it can recognize boolean results from `??`, `||`, and some `await` expressions. The typed `!!` check recognizes built-in receivers from syntax, uses declared property types on stable identifiers, and skips ordinary calls to user functions. Array and tuple element reads need syntax that proves the value is boolean.

The rule autofixes `!!` on direct equality and relational comparisons, `in`, `instanceof`, `!`, and `delete`. With typed linting and `strictNullChecks`, it can also autofix reads in variable initializers, returns, and array elements when both the read and the double negation have the exact type `boolean`.

Variable bindings must also have type `boolean`. For property reads in variable initializers, the declaration needs a TypeScript type annotation.

Other reports can offer suggestions because removing `!!` can change TypeScript inference or narrowing. The rule skips `!!` checks in files with direct `eval` calls.

The rule keeps `Boolean()` in TypeScript functions with inferred returns and in narrowing array predicates in checked JavaScript.

See [`prefer-native-coercion-functions`](./prefer-native-coercion-functions.md) for coercion wrappers and [`no-useless-boolean-cast`](./no-useless-boolean-cast.md) for casts in array predicates.

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
const array = [10, 20];

// ❌ Double coercion
const a = String(String(value));
// ❌ Already a boolean
const b = Boolean(left === right);
// ❌ Already a number
const c = Number(array.length);

// ✅
const a = String(value);
// ✅
const b = left === right;
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

```js
// ❌
const isEqual = !!(left === right);

// ✅
const isEqual = left === right;
```

```js
const someNumber = 42;
const someString = 'hello';

// ❌ Operator idioms on a value that is already the target type
const a = +someNumber;
const b = someString + '';
const c = someString.toString();

// ✅
const a = someNumber;
const b = someString;
const c = someString;
```

> [!TIP]
> Unlike [`@typescript-eslint/no-unnecessary-type-conversion`](https://typescript-eslint.io/rules/no-unnecessary-type-conversion), this rule works without [typed linting](https://typescript-eslint.io/getting-started/typed-linting), using type information only when available.
