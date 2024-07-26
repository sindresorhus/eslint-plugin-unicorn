# Prefer `globalThis` instead of `window`, `self` and `global`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

## Fail

```js
window
window.foo
window[foo]
window.foo()
global
global.foo
global[foo]
global.foo()
const { foo } = window
const { foo } = global
```

## Pass

```js
globalThis
globalThis.foo
globalThis[foo]
globalThis.foo()
const { foo } = globalThis
```
