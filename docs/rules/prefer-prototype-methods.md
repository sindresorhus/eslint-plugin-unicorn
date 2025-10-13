# Prefer borrowing methods from the prototype instead of the instance

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When “borrowing” a method from `Array` or `Object`, it's clearer to get it from the prototype than from an instance.

## Examples

```js
// ❌
const array = [].slice.apply(bar);

// ✅
const array = Array.prototype.slice.apply(bar);
```

```js
// ❌
const type = {}.toString.call(foo);

// ❌
const type = globalThis.toString.call(foo);

// ✅
const type = Object.prototype.toString.call(foo);
```

```js
// ❌
Reflect.apply([].forEach, arrayLike, [callback]);

// ✅
Reflect.apply(Array.prototype.forEach, arrayLike, [callback]);
```

```js
// ✅
const maxValue = Math.max.apply(Math, numbers);
```
