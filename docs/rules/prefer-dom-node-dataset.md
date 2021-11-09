# Prefer using `.dataset` on DOM elements over `.setAttribute(…)`

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `.setAttribute(…)`.


## Fail

```js
element.setAttribute('data-unicorn', '🦄');
```


## Pass

```js
element.dataset.unicorn = '🦄';
```
