# no-unnecessary-splice

📝 Disallow `Array#splice()` when simpler alternatives exist.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer clearer array methods over `Array#splice()` when no elements are removed, when adding or removing at the start or end, or when emptying an array.

## Examples

```js
// ❌
array.splice(index, 0);

// ✅
// Remove the no-op call.
```

```js
// ❌
array.splice(0, 1);

// ✅
array.shift();
```

```js
// ❌
array.splice(0, 0, item);

// ✅
array.unshift(item);
```

```js
// ❌
array.splice(array.length - 1, 1);

// ✅
array.pop();
```

```js
// ❌
array.splice(array.length, 0, item);

// ✅
array.push(item);
```

```js
// ❌
array.splice(0);

// ✅
array.length = 0;
```
