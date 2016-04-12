# Disallow `process.exit()`

This rule is an extension to [ESLint's `no-process-exit`](http://eslint.org/docs/rules/no-process-exit) rule, that allows `process.exit()` to be called in files that start with a hashbang `#!/usr/bin/env node`.


## Fail

```js
process.exit(0);
```


## Pass

```js
#!/usr/bin/env node
process.exit(0);
```
