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

Only shallow cases are reported; nested expressions are not recursively minimized. The rule is not autofixable, since moving the ternary can change evaluation order — review each report.

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
