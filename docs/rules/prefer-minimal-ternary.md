# prefer-minimal-ternary

📝 Prefer moving ternaries into the minimal varying part of an expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

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

Method calls support identifiers, literals, `this`, `super`, and member chains. Computed keys must be literals, identifiers, or `this`. Optional chains and calls within receivers or keys are ignored.

```js
// ❌
const foo = test ? object.store[key](a) : object.store[key](b);

// ✅
const foo = object.store[key](test ? a : b);
```

```js
// ❌
const total = test ? object.count + a : object.count + b;

// ✅
const total = object.count + (test ? a : b);
```

Static property swaps require [`checkComputedMemberAccess`](#checkcomputedmemberaccess); receiver swaps require [`checkVaryingBase`](#checkvaryingbase). Dynamic keys are reported by default:

```js
// ❌
const value = test ? state.cache[a] : state.cache[b];

// ✅
const value = state.cache[test ? a : b];
```

The rule also reports one varying object value, array element, or constructor argument:

```js
// ❌
const object = test ? {a: 1} : {a: 2};
const array = test ? [1, 2] : [1, 3];
const date = test ? new Date(a) : new Date(b);

// ✅
const object = {a: test ? 1 : 2};
const array = [1, test ? 2 : 3];
const date = new Date(test ? a : b);
```

- Objects require matching keys in the same order. Shorthand is supported; computed keys, methods, accessors, spreads, and prototype setters are ignored.
- Arrays require matching lengths, without spreads or holes.
- Constructors require the same identifier, argument count, and TypeScript type arguments, without spreads.

Shared values before the varying value must be simple expressions or member chains without optional chaining or calls.

Only shallow cases are reported; nested expressions are not recursively minimized. JavaScript and TypeScript expressions are supported, including Vue and Svelte templates.

Matching ignores comments and whitespace between tokens, including in TypeScript type arguments, and trailing commas in directly shared object literals. Member access ignores redundant receiver parentheses and equivalent string or static template keys. String, template, regex, and JSX text contents and other punctuation remain significant. Shared function and class expressions require identical source text.

## Limitations

Comments, unsafe evaluation reordering, Vue directive attributes, and statement bodies inside Vue interpolations prevent autofixes.

With [type information](https://typescript-eslint.io/getting-started/typed-linting/), the rule ignores ternaries whose minimization could change narrowing, overload resolution, generic inference, or correlated types, as well as shared-callee calls and constructors with rest parameters. These conservative checks can also skip safe transformations. They are best-effort; review type-sensitive fixes.

Without type information, TypeScript objects with shared non-literal values, even safe identifiers, receive suggestions instead of autofixes. Suggestions are subject to runtime and comment safeguards; review them for lost narrowing.

TypeScript `const enum` receivers are ignored when type information is available, since conditional receivers and keys would not compile.

## Design boundaries

These transformations are intentionally excluded:

- **Conditional spreads** (`test ? [1, 2] : [1]`): added spread syntax often hurts readability, including for multiple varying JSX attributes.
- **Object key swaps** (`test ? {a: 1} : {b: 1}`): computed keys obscure the object shapes.
- **String/template splitting** (`test ? 'cat' : 'car'`): shared text is not necessarily a meaningful unit.
- **`if`/`else` conversion**: belongs to [`prefer-ternary`](./prefer-ternary.md), which shares this rule's expression matching and fixes directly to the minimal form when safe.
- **TypeScript wrappers** (`test ? a! : b!`): factoring out `as`, `!`, or `satisfies` needs separate type-checking analysis.

## Options

### `checkVaryingBase`

Type: `boolean`\
Default: `false`

Also report ternaries that share everything but the base of a call or member access. Minimizing these moves the ternary into the base (`(test ? a : b)()`, `(test ? a : b).foo`), which hides the call site and makes it harder to find with text searches, so it is opt-in.

Varying-base member accesses are autofixed only with dot access or literal keys.

```js
/* eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}] */

// ❌
const foo = test ? a() : b();

// ✅
const foo = (test ? a : b)();
```

```js
/* eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}] */

// ❌
const foo = test ? a.method(value) : b.method(value);

// ✅
const foo = (test ? a : b).method(value);
```

```js
/* eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}] */

// ❌
const foo = test ? a.value : b.value;

// ✅
const foo = (test ? a : b).value;
```

### `checkComputedMemberAccess`

Type: `boolean`\
Default: `false`

Whether to also report static property or method name swaps on a shared receiver, including member chains. Calls must share their arguments. Includes statically known computed keys such as `object['a']` and `object[0]`; excludes optional chains and calls within receivers.

```js
/* eslint unicorn/prefer-minimal-ternary: ['error', {checkComputedMemberAccess: true}] */

// ❌
const value = test ? object.a : object.b;

// ✅
const value = object[test ? 'a' : 'b'];
```

```js
/* eslint unicorn/prefer-minimal-ternary: ['error', {checkComputedMemberAccess: true}] */

// ❌
await (delayRejection ? Promise.allSettled(promises) : Promise.all(promises));

// ✅
await Promise[delayRejection ? 'allSettled' : 'all'](promises);
```
