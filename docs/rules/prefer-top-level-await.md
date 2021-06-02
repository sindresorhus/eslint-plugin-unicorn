# Prefer top-level await over top-level promises and async function calls

Prefer [top level await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#top-level-await) over floating promises, async IIFE, and function call to an async function.

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
