# no-invalid-property-descriptor

📝 Disallow invalid property descriptors.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

<!-- Unknown fields intentionally use stricter validation than ECMAScript. -->

Check property descriptors passed to `Object.defineProperty()`, `Reflect.defineProperty()`, `Object.defineProperties()`, and `Object.create()`.

The rule reports:

- Non-object descriptors, such as `null`, `undefined`, strings, or numbers.
- Descriptors combining accessor fields (`get` or `set`) with data fields (`value` or `writable`). The presence of the fields matters, even when their values are `undefined` or `false`.
- `get` or `set` values that are known to be neither callable nor `undefined`.
- Unknown fields, including misspellings like `writeable`. Only `value`, `writable`, `get`, `set`, `enumerable`, and `configurable` are allowed. Known symbol fields are also reported.

The first three checks follow ECMAScript's [`ToPropertyDescriptor`](https://tc39.es/ecma262/2026/multipage/ecmascript-data-types-and-values.html#sec-topropertydescriptor) conversion. Unknown fields are silently ignored by JavaScript, but this rule disallows them to catch mistakes. Intentional metadata fields are therefore also reported.

`writable`, `enumerable`, and `configurable` are coerced to booleans by JavaScript, so their values do not have to be booleans. Empty descriptors, one-sided accessors, and explicit `get: undefined` or `set: undefined` are allowed. The rule does not check accessor bodies or return values.

## Examples

```js
// ❌
Object.defineProperty(object, 'property', {
	get: getter,
	writable: false,
});

Reflect.defineProperty(object, 'property', {get: null});

Object.defineProperties(object, {
	property: {value: 1, writeable: true},
});

Object.create(prototype, {
	property: 42,
});

// ✅
Object.defineProperty(object, 'property', {get: getter});

Reflect.defineProperty(object, 'property', {get: undefined});

Object.defineProperties(object, {
	property: {value: 1, writable: true},
});

Object.create(prototype, {
	property: {value: 42},
});
```

```js
// ❌
const descriptor = {get: getter, value: undefined};
Object.defineProperty(object, 'property', descriptor);

// ✅
const descriptor = {get: getter};
const descriptors = {property: descriptor};
Object.create(prototype, descriptors);
```

TypeScript's `PropertyDescriptor` type allows combining accessor and data fields. This rule reports the following descriptor even though it passes TypeScript's type checking:

```ts
// ❌
const descriptor = {
	get: () => 1,
	writable: false,
} satisfies PropertyDescriptor;

Object.defineProperty({}, 'property', descriptor);
```

## Suggestions

The rule provides a suggestion to rename `writeable` to `writable` when the descriptor has no `writable`, `get`, or `set` field. Shorthand values and comments are preserved. There is no autofix because changing descriptor fields can change runtime behavior.

## Limitations

The rule checks inline object literals and direct local `const` initializers used only as descriptors or descriptor maps. It skips aliases, exports, mutations, member accesses, and other uses that could expose these objects to mutation. Reused descriptors are reported once at their definitions.

Spreads, unresolved computed keys, inherited descriptor fields, and explicit descriptor prototypes other than `__proto__: null` are not analyzed. Getter/setter syntax on the descriptor object itself is counted for field presence, but its resulting values are not evaluated. Unknown accessor values, such as function-call results, are left unchanged.

Calls must use a direct `Object` or `Reflect` receiver. Constant computed method names are supported. Optional calls, aliases of these APIs, and spreads before the descriptor argument are skipped. Shadowed or modified built-ins, Proxy behavior, and accessor side effects are unsupported.

The rule validates descriptor conversion rather than whether a descriptor can be applied to a particular target. It does not check existing property attributes or target extensibility. Primitive outer descriptor maps are not rejected, and `Object.create(prototype, undefined)` is allowed.
