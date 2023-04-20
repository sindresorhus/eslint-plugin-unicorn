# Prefer borrowing methods from the prototype instead of the instance

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When “borrowing” a method from `Array` or `Object`, it's clearer to get it from the prototype than from an instance.

## Fail

```js
const array = [].slice.apply(bar);
```

```js
const type = {}.toString.call(foo);
```

```js
Reflect.apply([].forEach, arrayLike, [callback]);
```

## Pass

```js
const array = Array.prototype.slice.apply(bar);
```

```js
const type = Object.prototype.toString.call(foo);
```

```js
Reflect.apply(Array.prototype.forEach, arrayLike, [callback]);
```

```js
const maxValue = Math.max.apply(Math, numbers);
```
