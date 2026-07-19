# no-process-exit

📝 Disallow `process.exit()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is an extension to ESLint's [`no-process-exit` rule](https://eslint.org/docs/rules/no-process-exit). Calling `process.exit()` abruptly terminates the process and can bypass normal error propagation and cleanup, so this rule restricts it to files with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)), process event handlers, and files that statically load `worker_threads`.

## Replacement for ESLint `no-process-exit`

This rule replaces ESLint's built-in `no-process-exit` rule, which Unicorn presets disable when this rule is enabled.

## Examples

```js
// ❌
process.exit(0);

// ✅
#!/usr/bin/env node
process.exit(0);
```

```js
// ✅
process.on('SIGINT', () => {
	console.log('Got SIGINT');
	process.exit(1);
});
```

```js
// ✅
import workerThreads from 'node:worker_threads';

try {
	// Do something…
	process.exit(0);
} catch (_) {
	process.exit(1);
}
```
