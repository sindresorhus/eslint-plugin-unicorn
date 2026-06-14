# no-unreadable-object-destructuring

📝 Disallow unreadable object destructuring.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Destructuring is very useful, but it can also make some code harder to read. This rule prevents hard-to-read object destructuring patterns, including assigning destructured values to object properties.

## Examples

```js
// ✅
const {foo} = object;
```

```js
// ✅
const {foo: bar = defaultValue} = object;
```

```js
// ✅
const {foo: {bar}} = object;
```

```js
// ❌
const {[key]: value} = object;

// ✅
const value = object[key];
```

```js
// ❌
const {foo: [bar]} = object;

// ✅
const [bar] = object.foo;
```

```js
// ❌
const {foo: {bar: {baz}}} = object;

// ✅
const {baz} = object.foo.bar;
```

```js
// ❌
({foo: object.property} = object);

// ✅
({foo} = object);
object.property = foo;
```
