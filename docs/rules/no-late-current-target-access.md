# no-late-current-target-access

📝 Disallow accessing `event.currentTarget` after the synchronous event dispatch has finished.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`event.currentTarget`](https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget) is only set while the event is being dispatched synchronously. As soon as the handler yields, for example after an `await` or inside a deferred callback like `setTimeout()` or `.then()`, `currentTarget` is reset to `null`. Reading it then returns `null` instead of the element you expect.

Assign `event.currentTarget` to a variable synchronously and use that variable instead.

## Examples

```js
// ❌
element.addEventListener('click', event => {
	setTimeout(() => {
		event.currentTarget.click();
	});
});

// ✅
element.addEventListener('click', event => {
	const {currentTarget} = event;
	setTimeout(() => {
		currentTarget.click();
	});
});
```

```js
// ❌
element.addEventListener('click', async event => {
	event.currentTarget.disabled = true;
	await somePromise;
	event.currentTarget.disabled = false;
});

// ✅
element.addEventListener('click', async event => {
	const {currentTarget} = event;
	currentTarget.disabled = true;
	await somePromise;
	currentTarget.disabled = false;
});
```

## Limitations

- Any `event.currentTarget` access inside a nested function is flagged, even when the function runs synchronously (for example, `array.map(() => event.currentTarget)`). Assign it to a variable to make the synchronous reference explicit.
- The check is not flow-sensitive. An `event.currentTarget` access is flagged whenever an `await` or `yield` appears earlier in source, even when they are in mutually exclusive branches that can never both run (for example, `condition ? await foo() : event.currentTarget`).
- Passing the whole `event` object to another function cannot be detected, so a late `event.currentTarget` access in that function is not reported:

```js
function handleEvent(event) {
	console.log('Too late for', event.currentTarget);
}

element.addEventListener('click', event => {
	setTimeout(handleEvent, 1, event);
});
```
