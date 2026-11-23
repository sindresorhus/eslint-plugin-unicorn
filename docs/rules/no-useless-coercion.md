# no-useless-coercion

📝 Disallow useless type coercions of values that are already of the target type.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling `Boolean()`, `String()`, `Number()`, or `BigInt()` on a value that is already of that type is a no-op. It adds noise and can hide the author's intent.

This includes redundant double coercion, like `String(String(value))`, and coercing an expression whose type is already known, like `Boolean(a === b)` or `Number(array.length)`.

It also flags the equivalent operator idioms when the value is already the target type: `!!value` (boolean), `+value` (number), `value + ''` and `'' + value` (string), and `value.toString()` (string).

The rule recognizes common cases from syntax and uses TypeScript types when available. The boolean check uses declared types for identifiers and follows the initializer of an inferred `const name = value` binding. With typed linting, it also checks the compiler's type for expressions that it folds to a boolean. With `strictNullChecks`, it can recognize boolean results from `??`, `||`, and some `await` expressions. With type information, the `!!` check identifies built-in method receivers from syntax, uses declared property types only when the receiver is a stable identifier, and skips ordinary calls to user functions. For receivers typed as arrays or tuples, an indexed read needs syntax that proves its value is a boolean, since array methods can remove or shift elements.

The rule autofixes `!!` on direct equality and relational comparisons, `in`, `instanceof`, `!`, and `delete`. With typed linting and `strictNullChecks`, it also autofixes reads of type `boolean` in these positions.

- Variable reads in variable initializers, return values, and array elements, when the binding itself has type `boolean`.
- Property reads in return values, array elements, and variable initializers with an explicit TypeScript type annotation.

The rule suggests removing `!!` in other cases because removal can change inferred types or control-flow narrowing in TypeScript and in JavaScript checked by TypeScript. It skips this check in files with direct `eval` calls.

In TypeScript, `Boolean()` calls inside functions without explicit return annotations are ignored because removing them can introduce inferred type predicates. When `Boolean()` wraps a call to a function defined in the same file, the rule requires an explicit boolean return type or a return expression it can verify.

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
