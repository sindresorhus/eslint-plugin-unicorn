# Disallow `process.exit()`

This rule is an extension to ESLint's [`no-process-exit` rule](http://eslint.org/docs/rules/no-process-exit), that allows `process.exit()` to be called in files that start with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) → `#!/usr/bin/env node`.


## Fail

```js
process.exit(0);
```


## Pass

```js
#!/usr/bin/env node
process.exit(0);
```
