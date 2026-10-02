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

// ✅
Object.defineProperty(object, 'property', {get: getter});
```

```js
// ❌
Reflect.defineProperty(object, 'property', {get: null});

// ✅
Reflect.defineProperty(object, 'property', {get: undefined});
```

```js
// ❌
Object.defineProperties(object, {
	property: {value: 1, writeable: true},
});

// ✅
Object.defineProperties(object, {
	property: {value: 1, writable: true},
});
```

```js
// ❌
Object.create(prototype, {
	property: 42,
});

// ✅
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
Object.defineProperty({}, 'property', {
	get: () => 1,
	writable: false,
} satisfies PropertyDescriptor);

// ✅
Object.defineProperty({}, 'property', {
	get: () => 1,
} satisfies PropertyDescriptor);
```

## Suggestions

The rule provides a suggestion to rename `writeable` to `writable` when the descriptor has no `writable`, `get`, or `set` field. Shorthand values and comments are preserved. There is no autofix because changing descriptor fields can change runtime behavior.

## Limitations

The rule analyzes direct `Object`/`Reflect` calls with inline literals or local `const` object literal initializers used only as descriptors or descriptor maps. It skips optional calls, spreads before the descriptor argument or in descriptor/map literals, unresolved computed keys, and explicit descriptor prototypes other than `__proto__: null`.

Inherited fields and accessor results are not evaluated. Shadowed or modified built-ins, Proxy behavior, and side effects are unsupported. The rule does not check whether a target accepts a descriptor.
