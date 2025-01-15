# Disallow instanceof on built-in objects

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Using instanceof to determine the type of an object has [limitations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_multiple_realms).

Therefore, it is recommended to use a safer method, like `Object.prototype.toString.call(foo)` or npm package [@sindresorhus/is](https://www.npmjs.com/package/@sindresorhus/is) to determine the type of object.

Note that this rule does not provide automatic fixes except for `foo instanceof Array`.

## Examples

```js
foo instanceof String; // ❌
Object.prototype.toString.call(foo) === '[object String]'; // ✅
```

```js
foo instanceof Object; // ❌
Object.prototype.toString.call(foo) === '[object Object]'; // ✅
```

```js
foo instanceof Date; // ❌
Object.prototype.toString.call(foo) === '[object Date]'; // ✅
```

```js
import is from '@sindresorhus/is';
foo instanceof Map; // ❌
is(foo) === 'Map'; // ✅
```

```js
foo instanceof Array; // ❌
Array.isArray(foo); // ✅
```
