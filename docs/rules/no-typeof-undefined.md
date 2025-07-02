# Disallow comparing `undefined` using `typeof`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Checking if a value is `undefined` by using `typeof value === 'undefined'` is needlessly verbose. It's generally better to compare against `undefined` directly. The only time `typeof` is needed is when a global variable potentially does not exists, in which case, using `globalThis.value === undefined` may be better.

Historical note: Comparing against `undefined` without `typeof` was frowned upon until ES5. This is no longer a problem since all engines currently in use no longer allow reassigning the `undefined` global.

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

The rule ignores variables not defined in the file by default.

Set it to `true` to check all variables.

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": true}]
if (typeof undefinedVariable === 'undefined') {} // Fails
```

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": true}]
if (typeof Array === 'undefined') {}  // Fails
```
