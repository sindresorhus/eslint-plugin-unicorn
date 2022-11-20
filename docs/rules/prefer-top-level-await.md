# Prefer top-level await over top-level promises and async function calls

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[Top-level await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#top_level_await) is more readable and can prevent unhandled rejections.

## Fail

```js
(async () => {
	try {
		await run();
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
```

```js
run().catch(error => {
	console.error(error);
	process.exit(1);
});
```

```js
async function main() {
	try {
		await run();
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}

main();
```

## Pass

```js
await run();
```
