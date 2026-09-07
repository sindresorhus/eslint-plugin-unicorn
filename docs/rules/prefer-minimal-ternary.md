# prefer-minimal-ternary

📝 Prefer moving ternaries into the minimal varying part of an expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports ternaries where both branches share the same outer shape and only one subexpression varies. Moving the ternary into the varying part avoids duplicating the rest and makes the real difference easier to see.

## Examples

```js
// ❌
const foo = test ? call(a) : call(b);

// ✅
const foo = call(test ? a : b);
```

```js
// ❌
const foo = test ? a + 1 : b + 1;

// ✅
const foo = (test ? a : b) + 1;
```

Member access ternaries are not reported when only a static property name varies (`object.a : object.b`), since minimizing them needs computed member access in place of clearer property access. When only the object varies (`a.foo : b.foo`), minimizing moves the ternary into the base (`(test ? a : b).foo`), wrapping the receiver in a conditional and breaking TypeScript `const enum` access, so it is off by default (opt in with [`checkVaryingBase`](#checkvaryingbase)). But a dynamic computed key is already computed, so it is reported:

```js
// ❌
const value = test ? cache[a] : cache[b];

// ✅
const value = cache[test ? a : b];
```

Object literals with the same property keys in the same order are reported when only one property value varies. Ordinary properties and shorthand properties are supported; computed properties, methods, accessors, spreads, and `__proto__` prototype setters are ignored.

```js
// ❌
const object = test ? {a: 1} : {a: 2};

// ✅
const object = {a: test ? 1 : 2};
```

Array literals with the same length are reported when only one element varies. Arrays with spreads or holes are ignored.

```js
// ❌
const array = test ? [1, 2] : [1, 3];

// ✅
const array = [1, test ? 2 : 3];
```

Constructor calls with the same identifier and argument count are reported when only one argument varies. TypeScript type arguments must match. Member constructors (`new namespace.Foo()`) and spread arguments are ignored.

```js
// ❌
const date = test ? new Date(a) : new Date(b);

// ✅
const date = new Date(test ? a : b);
```

For these object, array, and constructor cases, shared values before the varying value must be simple expressions, such as identifiers or literals. Shared calls and property accesses in those positions are ignored because moving them before the condition could change their behavior.

Only shallow cases are reported; nested expressions are not recursively minimized. The rule is not autofixable, since moving the ternary can change evaluation order. Review each report.

## Design boundaries

The goal is to make one varying value easier to see, not to remove every repeated expression. Keeping complete alternatives together can be clearer, especially when several values differ. The following transformations are intentionally outside this rule's scope:

- **Conditional spreads** (`test ? [1, 2] : [1]`), including arrays of different lengths and multiple varying JSX attributes: introducing spreads and conditional objects or arrays often makes the result harder to read.
- **Object key swaps** (`test ? {a: 1} : {b: 1}`): forcing computed property names obscures otherwise explicit object shapes.
- **String and template splitting** (`test ? 'cat' : 'car'`): a shared prefix or suffix does not necessarily form a meaningful unit of text; splitting it can make the alternatives harder to read.
- **`if`/`else` conversion** (`if (test) { a(); } else { b(); }`): creating a ternary belongs to [`prefer-ternary`](./prefer-ternary.md), whose scope is returning or assigning values, not standalone calls.
- **Factoring out TypeScript wrappers** (`test ? a! : b!`), including `as`, `!`, and `satisfies`: moving a type operation from individual branches to their combined expression needs separate consideration of type-checking behavior.

## Options

### `checkVaryingBase`

Type: `boolean`\
Default: `false`

Also report ternaries that share everything but the base of a call or member access. Minimizing these moves the ternary into the base (`(test ? a : b)()`, `(test ? a : b).foo`), which hides the call site, breaks plain-text searches, and breaks TypeScript `const enum` access, so it is opt-in.

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkVaryingBase": true}]

// ❌
const foo = test ? a() : b();

// ✅
const foo = (test ? a : b)();
```

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkVaryingBase": true}]

// ❌
const foo = test ? a.method(value) : b.method(value);

// ✅
const foo = (test ? a : b).method(value);
```

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkVaryingBase": true}]

// ❌
const foo = test ? a.value : b.value;

// ✅
const foo = (test ? a : b).value;
```

When [type information](https://typescript-eslint.io/getting-started/typed-linting/) is available, objects that are a TypeScript `const enum` are never reported, since a `const enum` may appear only in a direct property or index access, so `(test ? a : b).value` would not compile. Without type information, they are indistinguishable from normal objects and are still reported.

### `checkComputedMemberAccess`

Type: `boolean`\
Default: `false`

Also report method-call ternaries that share the object and arguments and differ only by the method name. Minimizing these requires computed member access, so it is opt-in.

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkComputedMemberAccess": true}]

// ❌
await (delayRejection ? Promise.allSettled(promises) : Promise.all(promises));

// ✅
await Promise[delayRejection ? 'allSettled' : 'all'](promises);
```
