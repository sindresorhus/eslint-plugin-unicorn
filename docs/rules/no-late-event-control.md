# no-late-event-control

📝 Disallow event-control method calls after the synchronous event dispatch has finished.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`event.preventDefault()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault), [`event.stopPropagation()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation), and [`event.stopImmediatePropagation()`](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopImmediatePropagation) only affect the event while it is being dispatched synchronously. After an `await`, deferred callback, or generator-handler call, event dispatch has already continued or finished, so these calls are too late to cancel the default action or stop propagation.

Call event-control methods before the handler suspends. Do not use generator functions as event handlers when event control is needed, because their body does not run during dispatch.

## Examples

```js
// ❌
element.addEventListener('click', async event => {
	await save();
	event.preventDefault();
});

// ✅
element.addEventListener('click', async event => {
	event.preventDefault();
	await save();
});
```

```js
// ❌
element.addEventListener('click', event => {
	setTimeout(() => {
		event.stopPropagation();
	});
});

// ✅
element.addEventListener('click', event => {
	event.stopPropagation();
	setTimeout(() => {
		update();
	});
});
```

## Limitations

- Any event-control call inside a nested function is flagged, even when the function runs synchronously (for example, `array.map(() => event.preventDefault())`). Call it in the outer handler to make the synchronous timing explicit.
- Any event-control call inside a generator handler is flagged, because calling the generator creates an iterator instead of running the handler body during event dispatch.
- The check is not flow-sensitive. An event-control call is flagged whenever an `await` or `yield` appears earlier in source, even when they are in mutually exclusive branches that can never both run.
- Passing the whole `event` object to another function cannot be detected, so a late event-control call in that function is not reported:

```js
function prevent(event) {
	event.preventDefault();
}

element.addEventListener('click', event => {
	setTimeout(prevent, 1, event);
});
```
