# Prefer using `.dataset` on DOM elements over `.setAttribute(…)`

Use [`.dataset`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset) on DOM elements over `.setAttribute(…)`.

This rule is fixable.


## Fail

```js
element.setAttribute('data-unicorn', '🦄');
```


## Pass

```js
element.dataset.unicorn = '🦄';
```
