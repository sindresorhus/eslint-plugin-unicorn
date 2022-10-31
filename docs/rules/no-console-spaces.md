# Do not use leading/trailing space between `console.log` parameters

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The [`console.log()` method](https://developer.mozilla.org/en-US/docs/Web/API/Console/log) and similar methods joins the parameters with a space, so adding a leading/trailing space to a parameter, results in two spaces being added.

## Fail

```js
console.log('abc ', 'def');
console.log('abc', ' def');

console.log("abc ", " def");
console.log(`abc `, ` def`);

console.debug('abc ', 'def');
console.info('abc ', 'def');
console.warn('abc ', 'def');
console.error('abc ', 'def');
```

## Pass

```js
console.log('abc');
console.log('abc', 'def');

console.log('abc ');
console.log(' abc');

console.log('abc  ', 'def');
console.log('abc\t', 'def');
console.log('abc\n', 'def');

console.log(`
	abc
`);
```
