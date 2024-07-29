# Prefer `globalThis` instead of `window`, `self` and `global`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule will enforce the use of `globalThis` over `window`, `self`, and `global`.

But some platform-specific APIs still be allowed (e.g. `window.innerWidth`, `window.innerHeight`, `window.navigator`). You can find the list of APIs in the source code of this rule.

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
// Window specific APIs
window.innerWidth
window.innerHeight
window.addEventListener('click', () => {})
window.location
window.navigator

// Worker specific APIs
self.postMessage('Hello')
self.onmessage = () => {}

globalThis
globalThis.foo
globalThis[foo]
globalThis.foo()
const { foo } = globalThis
```
