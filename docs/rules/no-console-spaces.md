# Do not use leading/trailing space between `console.log` parameters

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`console.log()` method](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods joins the parameters with a space, so adding a leading/trailing space to a parameter, results in two spaces being added.

## Examples

```js
// ❌
console.log('abc ', 'def');

// ❌
console.log('abc', ' def');

// ❌
console.log("abc ", " def");

// ❌
console.log(`abc `, ` def`);

// ✅
console.log('abc', 'def');
```

```js
// ❌
console.debug('abc ', 'def');

// ✅
console.debug('abc', 'def');
```

```js
// ❌
console.info('abc ', 'def');

// ✅
console.info('abc', 'def');
```

```js
// ❌
console.warn('abc ', 'def');

// ✅
console.warn('abc', 'def');
```

```js
// ❌
console.error('abc ', 'def');

// ✅
console.error('abc', 'def');
```

```js
// ✅
console.log('abc ');

// ✅
console.log(' abc');
```

```js
// ✅
console.log('abc  ', 'def');

// ✅
console.log('abc\t', 'def');

// ✅
console.log('abc\n', 'def');
```
