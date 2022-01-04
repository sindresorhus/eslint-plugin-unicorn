# Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

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
