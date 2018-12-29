# Prefer `querySelector` over `getElementById`, `querySelectorAll` over `getElementsByClassName` and `getElementsByTagName`

They are not faster than `querySelector` and it's better to be consistent.


## Fail

```js
document.getElementById('foo');
```


## Pass

```js
document.querySelector('#foo');
```
