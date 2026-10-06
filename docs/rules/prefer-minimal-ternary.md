# prefer-minimal-ternary

📝 Prefer moving ternaries into the minimal varying part of an expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

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

Direct method calls are also supported when the receiver is an identifier, literal, `this`, or `super`, and the method uses dot access or a literal computed key. Optional chaining, dynamic method keys, and chained receivers are ignored.

```js
// ❌
const foo = test ? object.method(a) : object.method(b);

// ✅
const foo = object.method(test ? a : b);
```

```js
// ❌
const foo = test ? a + 1 : b + 1;

// ✅
const foo = (test ? a : b) + 1;
```

Member access with a varying static property name or receiver is opt-in through [`checkComputedMemberAccess`](#checkcomputedmemberaccess) or [`checkVaryingBase`](#checkvaryingbase). Dynamic computed keys are reported by default:

```js
// ❌
const value = test ? cache[a] : cache[b];

// ✅
const value = cache[test ? a : b];
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

For these cases, shared values before the varying value must be simple expressions such as identifiers or literals.

Only shallow cases are reported; nested expressions are not recursively minimized. JavaScript and TypeScript expressions are supported, including Vue and Svelte templates.

Shared expressions and explicit TypeScript type arguments are compared without comments or whitespace between tokens. A trailing comma in a directly shared object literal is also ignored. String, template, regular expression, and JSX text contents and other punctuation remain significant. Shared expressions containing functions or classes require identical source text, since line breaks inside them can change behavior.

## Autofix limitations

Autofixes preserve evaluation order or only reorder safe expressions. Cases with comments or unsafe reordering are reported without a fix.

Vue directive attributes and statement bodies inside interpolations are reported without a fix, since their quoting and statement syntax need separate handling. Expression-only interpolations and script expressions can be autofixed.

With [type information](https://typescript-eslint.io/getting-started/typed-linting/), the rule also withholds fixes that could lose branch narrowing or change overload resolution, generic inference, or correlated object and tuple types. These checks are conservative and do not prove that every transformation preserves TypeScript types. Without type information, review fixes that depend on narrowing or overloads.

Shared-callee calls and constructors with rest parameters are reported without a fix when type information is available. Rest tuple types can describe relationships between arguments that combining the branches would lose.

For example, this is reported without an autofix when type information is available. Moving `value` outside the branches loses its narrowing and makes the addition invalid:

```ts
declare const value: string | number;
const result = typeof value === 'string' ? value + 'a' : value + 1;
```

TypeScript `const enum` receivers are not reported when type information is available: conditional receivers and conditional member keys cannot be used with a `const enum`. Without types, these receivers cannot be distinguished from ordinary objects.

## Design boundaries

These transformations are intentionally excluded:

- **Conditional spreads** (`test ? [1, 2] : [1]`): added spread syntax often hurts readability, including for multiple varying JSX attributes.
- **Object key swaps** (`test ? {a: 1} : {b: 1}`): computed keys obscure the object shapes.
- **String/template splitting** (`test ? 'cat' : 'car'`): shared text is not necessarily a meaningful unit.
- **`if`/`else` conversion** (`if (test) { a(); } else { b(); }`): belongs to [`prefer-ternary`](./prefer-ternary.md), which targets returns and assignments.
- **TypeScript wrappers** (`test ? a! : b!`): factoring out `as`, `!`, or `satisfies` needs separate type-checking analysis.

## Options

### `checkVaryingBase`

Type: `boolean`\
Default: `false`

Also report ternaries that share everything but the base of a call or member access. Minimizing these moves the ternary into the base (`(test ? a : b)()`, `(test ? a : b).foo`), which hides the call site and makes it harder to find with text searches, so it is opt-in.

Varying-base member accesses are autofixed only with dot access or literal keys.

```js
// eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}]

// ❌
const foo = test ? a() : b();

// ✅
const foo = (test ? a : b)();
```

```js
// eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}]

// ❌
const foo = test ? a.method(value) : b.method(value);

// ✅
const foo = (test ? a : b).method(value);
```

```js
// eslint unicorn/prefer-minimal-ternary: ['error', {checkVaryingBase: true}]

// ❌
const foo = test ? a.value : b.value;

// ✅
const foo = (test ? a : b).value;
```

### `checkComputedMemberAccess`

Type: `boolean`\
Default: `false`

Also report property-read and method-call ternaries that share the same simple receiver and differ only by the static property or method name. Method calls must also share the same arguments. Minimizing these requires computed member access, so it is opt-in. Statically known computed keys, such as `object['a']` and `object[0]`, are included. Receivers are limited to identifiers, literals, `this`, and `super`.

```js
// eslint unicorn/prefer-minimal-ternary: ['error', {checkComputedMemberAccess: true}]

// ❌
const value = test ? object.a : object.b;

// ✅
const value = object[test ? 'a' : 'b'];
```

```js
// eslint unicorn/prefer-minimal-ternary: ['error', {checkComputedMemberAccess: true}]

// ❌
await (delayRejection ? Promise.allSettled(promises) : Promise.all(promises));

// ✅
await Promise[delayRejection ? 'allSettled' : 'all'](promises);
```
