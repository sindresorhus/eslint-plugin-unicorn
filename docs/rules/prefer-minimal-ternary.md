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

Ternaries where only a static property name varies (`object.a : object.b` or `object['a'] : object['b']`) are not reported, since minimizing them needs computed member access (`object[test ? 'a' : 'b']`) in place of clearer property access. But a dynamic computed key is already computed, so it is reported:

```js
// ❌
const value = test ? cache[a] : cache[b];

// ✅
const value = cache[test ? a : b];
```

Only shallow cases are reported; nested expressions are not recursively minimized. The rule is not autofixable, since moving the ternary can change evaluation order — review each report.

## Options

### `checkVaryingCallee`

Type: `boolean`\
Default: `false`

Also report call ternaries that share the arguments and differ only by the callee. Minimizing these moves the ternary in front of the call (`(test ? a : b)()`), which hides the call site and breaks plain-text searches for the call, so it is opt-in.

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkVaryingCallee": true}]

// ❌
const foo = test ? a() : b();

// ✅
const foo = (test ? a : b)();
```

```js
// eslint unicorn/prefer-minimal-ternary: ["error", {"checkVaryingCallee": true}]

// ❌
const foo = test ? a.method(value) : b.method(value);

// ✅
const foo = (test ? a : b).method(value);
```

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
