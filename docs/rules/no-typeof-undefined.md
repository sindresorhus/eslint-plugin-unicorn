# Enforce compare with `undefined` directly

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce compare value with `undefined` directly instead of compare `typeof value` with `'undefined'`.

## Fail

```js
if (typeof foo === 'undefined') {}
```

```js
if (typeof foo !== 'undefined') {}
```

## Pass

```js
if (foo === undefined) {}
```

```js
if (foo !== undefined) {}
```

## Options

### checkGlobalVariables

Type: `boolean`\
Default: `true`

Set it to `false` to ignore variables not defined in file.

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": false}]
if (typeof undefinedVariable === 'undefined') {} // Passes
```

```js
// eslint unicorn/no-typeof-undefined: ["error", {"checkGlobalVariables": false}]
if (typeof Array === 'undefined') {}  // Passes
```
