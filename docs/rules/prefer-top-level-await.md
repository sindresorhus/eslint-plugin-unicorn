# Prefer top-level await over top-level promises and async function calls

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

[Top-level await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#top-level-await) is more readable and can prevent unhandled rejections.

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
