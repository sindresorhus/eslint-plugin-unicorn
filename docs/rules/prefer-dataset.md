# Prefer the .dataset property on DOM elements over using setAttribute

Enforces the use of, for example, `element.dataset.key` over `element.setAttribute('data-key', 'foo')` for DOM elements.

This rule is fixable.


## Fail

```js
element.setAttribute('data-unicorn', '🦄');
```

## Pass

```js
element.dataset.unicorn = '🦄';
```
