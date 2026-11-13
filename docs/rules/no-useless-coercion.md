# no-useless-coercion

📝 Disallow useless type coercions of values that are already of the target type.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling `Boolean()`, `String()`, `Number()`, or `BigInt()` on a value that is already of that type is a no-op. It adds noise and can hide the author's intent.

This includes redundant double coercion, like `String(String(value))`, and coercing an expression whose type is already known, like `Boolean(a === b)` or `Number(array.length)`.

It also flags the equivalent operator idioms when the value is already the target type: `!!value` (boolean), `+value` (number), `value + ''` and `'' + value` (string), and `value.toString()` (string).

The rule recognizes common cases from syntax and uses TypeScript types when available, including the return types of calls. With `strictNullChecks`, it can also recognize boolean results from `??`, `||`, and some `await` expressions. It can leave `!!` in place for unchecked array reads and nested property reads.

The rule suggests removing `!!` because removal can change inferred types in TypeScript and in JavaScript checked by TypeScript. It skips this check in files with `with` statements or direct `eval` calls.

In TypeScript, `Boolean()` calls inside functions without explicit return annotations are ignored because removing them can introduce inferred type predicates.

For redundant wrapper callbacks like `array.map(x => String(x))`, see [`prefer-native-coercion-functions`](./prefer-native-coercion-functions.md). For `Boolean()` casts inside array predicate callbacks, see [`no-useless-boolean-cast`](./no-useless-boolean-cast.md).

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

```js
// ❌
const isEqual = !!(left === right);

// ✅
const isEqual = left === right;
```

```js
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
