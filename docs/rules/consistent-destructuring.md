# consistent-destructuring

📝 Use destructured variables over properties.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of already destructured variables over accessing the same direct, non-computed identifier property again. Previous destructurings are easily missed which leads to an inconsistent code style.

This rule is partly fixable. It does not suggest adding new properties to existing destructuring patterns, as that could read properties earlier than before.

## Examples

```js
// ❌
const {a} = foo;
console.log(foo.a);

// ✅
const {a} = foo;
console.log(a);

// ✅
console.log(foo.a, foo.b);
```

```js
// ✅
const {a} = foo;
console.log(a, foo.b);
```

```js
// ✅
const {
	a: {b},
} = foo;
console.log(foo.a.c);
```

```js
// ❌
const {bar} = foo;
const {a} = foo.bar;

// ✅
const {bar} = foo;
const {a} = bar;
```

```js
// ✅
const {a} = foo;
console.log(a, foo.b());
```

```js
// ✅
const {a} = foo.bar;
console.log(foo.bar.a);
```
