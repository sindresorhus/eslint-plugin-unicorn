# Disallow immediate mutation after declaration

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Immediate mutation of `Array` and `Object` after declaration is unnecessary, it should be done in variable initialization.

## Examples

```js
// ❌
const array = [1, 2];
array.push(3, 4);

// ✅
const array = [1, 2, 3, 4];
```

```js

// ❌
const array = [3, 4];
array.unshift(1, 2);

// ✅
const array = [1, 2, 3, 4];
```

```js
// ❌
const object = {foo: 'foo'};
object.bar = 'bar';

// ✅
const obj = {foo: 'foo', bar: 'bar'};
```