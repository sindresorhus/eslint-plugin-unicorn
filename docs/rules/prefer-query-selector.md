# Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

It's better to use the same method to query DOM elements.

## Fail

```js
document.getElementById('foo');
document.getElementsByClassName('foo bar');
document.getElementsByTagName('main');
document.getElementsByClassName(fn());
```

## Pass

```js
document.querySelector('#foo');
document.querySelector('.bar');
document.querySelector('main #foo .bar');
document.querySelectorAll('.foo .bar');
document.querySelectorAll('li a');
document.querySelector('li').querySelectorAll('a');
```
