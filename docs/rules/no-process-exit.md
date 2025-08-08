# Disallow `process.exit()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is an extension to ESLint's [`no-process-exit` rule](https://eslint.org/docs/rules/no-process-exit), that allows `process.exit()` to be called in files that start with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) → `#!/usr/bin/env node`. It also allows `process.exit()` to be called in `process.on('<event>', func)` event handlers and in files that imports `worker_threads`.

## Fail

```js
process.exit(0);
```

## Pass

```js
#!/usr/bin/env node
process.exit(0);
```

```js
process.on('SIGINT', () => {
    console.log('Got SIGINT');
    process.exit(1);
});
```

```js
import workerThreads from 'node:worker_threads';

try {
	// Do something…
	process.exit(0);
} catch (_) {
	process.exit(1);
}
```
