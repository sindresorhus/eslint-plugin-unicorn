# Bans `array.splice()` calls where it's a no-op or can be replaced with `shift`/`unshift`/`pop`/`push` calls

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule bans uses of `array.splice()` that can be replaced with `push`/`pop`/`shift`/`unshift` calls that make the intent more readible.

## Fail

```js
array.splice(index, 0) // will be removed
array.splice(0, 1)
array.splice(0, 0, element)
array.splice(array.length - 1, 1)
array.splice(array.length - 1, 0, element)

array['splice'](index, 0)

// in following cases no autofix will be applied
const fn = array => array.splice(index, 0)
const obj = { prop: array.splice(index, 0) }
function fn2(array) { return array.splice(index, 0) }
fn2(array.splice(index, 0))

```

## Pass

```js
array.shift()
array.unshift(element)
array.pop()
array.push(element)
```
