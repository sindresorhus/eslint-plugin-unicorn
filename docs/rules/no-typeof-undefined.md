# Enforce compare with `undefined` directly

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce compare value with `undefined` directly instead of compare `typeof value` with `'undefined'`.

## Fail

```js
function foo(bar) {
	if (typeof bar === 'undefined') {}
}
```

```js
import foo from './foo.js';
if (typeof foo.bar !== 'undefined') {}
```

## Pass

```js
function foo(bar) {
	if (foo === undefined) {}
}
```

```js
import foo from './foo.js';
if (foo.bar !== undefined) {}
```

## Options

### checkGlobalVariables

Type: `boolean`\
Default: `false`

This rule ignores variables not defined in file by default.

Set it to `true` to check all variables.

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": true}]
if (typeof undefinedVariable === 'undefined') {} // Fails
```

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": true}]
if (typeof Array === 'undefined') {}  // Fails
```
