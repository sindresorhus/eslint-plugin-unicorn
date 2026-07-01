# prefer-object-iterable-methods

📝 Prefer the most specific `Object` iterable method.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer the most direct `Object` iterable method for the data being used.

Use `Object.values()` when only values are needed, `Object.entries()` when both keys and values are needed, and `Object.keys()` when only keys are needed.

This rule reports `for…of` loops, `Object.keys().map()` callbacks, and `Object.entries()` callbacks for `.map()`, `.every()`, `.some()`, `.findIndex()`, `.findLastIndex()`, `.flatMap()`, `.forEach()`, `.reduce()`, and `.reduceRight()`.

`Object.entries().reduce()` and `Object.entries().reduceRight()` are only reported when an initial value is provided.

## Examples

```js
// ❌
for (const key of Object.keys(object)) {
	foo(object[key]);
}

// ✅
for (const value of Object.values(object)) {
	foo(value);
}
```

```js
// ❌
Object.keys(object).map(key => foo(object[key], key));

// ✅
Object.entries(object).map(([key, value]) => foo(value, key));
```

```js
// ❌
Object.entries(object).reduce((result, [key, value]) => result + value, 0);

// ✅
Object.values(object).reduce((result, value) => result + value, 0);
```

```js
// ❌
for (const [key] of Object.entries(object)) {
	foo(key);
}

// ✅
for (const key of Object.keys(object)) {
	foo(key);
}
```

When a value access uses a TypeScript cast on the object, the cast is moved onto the iterable method argument so the inferred element type is preserved.

```ts
// ❌
for (const key of Object.keys(object)) {
	foo((object as Record<string, unknown>)[key]);
}

// ✅
for (const value of Object.values(object as Record<string, unknown>)) {
	foo(value);
}
```
