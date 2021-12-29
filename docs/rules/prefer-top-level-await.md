# Prefer top-level await over top-level promises and async function calls

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*

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
