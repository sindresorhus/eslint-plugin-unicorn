# Prefer `.startsWith` and `.endsWith` 

Determine whether a string begins/ends with characters with `.startWith` and `.endsWith` over using regex

## Fail

```js
/^bar/.test(foo)
/bar$/.test(foo)
```


## Pass

```js
foo.startsWith('bar')
foo.endsWith('bar')
```
