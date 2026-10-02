# no-prevent-default-in-passive-listener

📝 Disallow ineffective `preventDefault()` calls in passive event listeners.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Calling [`preventDefault()`](https://dom.spec.whatwg.org/#dom-event-preventdefault) on the event received by a passive listener has no effect, even when the event is cancelable. This applies to every event type, including custom events.

If cancellation is intended, use `{passive: false}`. Otherwise, remove the `preventDefault()` call. This rule offers an editor suggestion to change `passive` to `false`, but does not automatically fix the code because enabling cancellation changes runtime behavior.

## Examples

```js
// ❌
element.addEventListener('wheel', event => {
	event.preventDefault();
}, {passive: true});

// ✅
element.addEventListener('wheel', event => {
	event.preventDefault();
}, {passive: false});
```

```js
// ✅
element.addEventListener('wheel', event => {
	console.log(event.deltaY);
}, {passive: true});
```

Async callbacks are checked before they suspend:

```js
// ❌
element.addEventListener('click', async event => {
	event.preventDefault();
	await save();
}, {passive: true});
```

## Limitations

- Only directly supplied arrow functions and function expressions are checked. Named callbacks, listener objects, nested functions (including immediately invoked functions), and generator callbacks are ignored.
- The event must be the callback's first parameter and a simple identifier. Aliases, destructured/default/rest parameters, `arguments`, and reassigned event parameters are ignored.
- Options must be an inline object without spreads or computed keys. The last `passive` property must be a normal data property with the literal value `true`. Dynamic options, truthy non-booleans, and type assertions on the property's value are ignored.
- Async callbacks use conservative source-order tracking. Calls after an earlier `await` or `for await...of`, or in repeating loop parts containing a suspension point, are ignored even when separate branches cannot both execute.
- Browser-default passive listeners and legacy cancellation through `event.returnValue` are not checked. Event targets are recognized by the `addEventListener` method name without type analysis.

## Related rules

- [`require-passive-events`](require-passive-events.md) requires passive registration for high-frequency listeners that do not need cancellation.
- [`no-late-event-control`](no-late-event-control.md) checks event-control calls after suspension or inside nested functions and generator callbacks.
