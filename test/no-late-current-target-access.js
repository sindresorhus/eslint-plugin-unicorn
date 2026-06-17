import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Synchronous access in the handler
		'element.addEventListener("click", event => { event.currentTarget.disabled = true; });',
		// Access before the `await`
		outdent`
			element.addEventListener("click", async event => {
				event.currentTarget.disabled = true;
				await somePromise;
			});
		`,
		// Saved to a variable before the `await`
		outdent`
			element.addEventListener("click", async event => {
				const currentTarget = event.currentTarget;
				await somePromise;
				currentTarget.disabled = false;
			});
		`,
		// Read synchronously on the assignment target, before the `await` of the right-hand side
		'element.onclick = async event => { event.currentTarget.href = await getUrl(location.href); };',
		// Argument of an awaited call is evaluated synchronously
		'element.onclick = async event => { await foo(event.currentTarget); };',
		// A synchronous argument is evaluated before a later awaited argument in the same call
		'element.onclick = async event => { log(event.currentTarget.value, await ready()); };',
		// The iterable expression is evaluated before the `for await…of` suspension
		'element.onclick = async event => { for await (const chunk of event.currentTarget.stream()) { log(chunk); } };',
		// Read synchronously before a `yield` suspends the generator handler
		'element.onclick = function * (event) { event.currentTarget.disabled = true; yield somePromise; };',
		// The `for…of` iterable is evaluated once before the awaiting loop body
		outdent`
			element.onclick = async event => {
				for (const child of event.currentTarget.children) {
					await render(child);
				}
			};
		`,
		// Object is not a parameter
		'async function handler() { const event = getEvent(); await somePromise; event.currentTarget.foo(); }',
		// Different property
		'async event => { await somePromise; event.target.foo(); }',
		// Computed access is not matched
		'async event => { await somePromise; event["currentTarget"].foo(); }',
		// Global `event` does not resolve to a parameter
		'async () => { await somePromise; event.currentTarget.foo(); }',
		// A shadowing inner parameter is accessed synchronously, even while the outer handler is suspended
		outdent`
			async function outer(event) {
				await somePromise;
				element.addEventListener("click", event => {
					event.currentTarget.foo();
				});
			}
		`,
		// An `await` confined to a nested callback does not affect the handler
		outdent`
			element.onclick = event => {
				promise.then(async () => {
					await somePromise;
				});
				event.currentTarget.foo();
			};
		`,
		// Destructured `currentTarget` parameter is not a member access
		outdent`
			element.onclick = async ({currentTarget}) => {
				await somePromise;
				currentTarget.disabled = false;
			};
		`,
		// Non-event parameters can have a `currentTarget` property
		outdent`
			async function updateWidget(widget) {
				await widget.load();
				widget.currentTarget.render();
			}
		`,
	],
	invalid: [
		// After `await`
		outdent`
			element.addEventListener("click", async event => {
				await somePromise;
				event.currentTarget.disabled = false;
			});
		`,
		// After `yield` in a generator handler, the dispatch has likewise finished
		outdent`
			element.onclick = function * (event) {
				yield somePromise;
				event.currentTarget.disabled = false;
			};
		`,
		// Short parameter name
		'element.onclick = async e => { await somePromise; e.currentTarget.foo(); };',
		// Event-like camelCase parameter name
		'element.onclick = async mouseDownEvent => { await somePromise; mouseDownEvent.currentTarget.foo(); };',
		// An earlier awaited argument suspends before a later argument in the same call
		'element.onclick = async event => { log(await ready(), event.currentTarget.value); };',
		// Issue example: only the access after the `await` is reported
		outdent`
			element.onclick = async event => {
				event.currentTarget.disabled = true;
				await somePromise;
				event.currentTarget.disabled = false;
			};
		`,
		// Nested function (implicit return)
		'element.onclick = event => setTimeout(() => event.currentTarget.click());',
		// Nested function (block body)
		outdent`
			element.onclick = event => {
				setTimeout(() => {
					event.currentTarget.remove();
				}, 1);
			};
		`,
		// Nested function in a `.then()` callback
		'element.onclick = event => { fetch(url).then(() => event.currentTarget.foo()); };',
		// Optional chaining after `await`
		'async event => { await somePromise; event?.currentTarget.foo(); }',
		// Named function declaration handler
		outdent`
			async function handleClick(event) {
				await somePromise;
				event.currentTarget.disabled = false;
			}
		`,
		// After a `for await…of` loop
		outdent`
			element.onclick = async event => {
				for await (const chunk of stream) {
					log(chunk);
				}
				event.currentTarget.disabled = false;
			};
		`,
		// Inside a `for await…of` loop body
		outdent`
			element.onclick = async event => {
				for await (const chunk of stream) {
					event.currentTarget.append(chunk);
				}
			};
		`,
		// The `for…of` iterable is awaited, so the loop body runs after suspension
		outdent`
			element.onclick = async event => {
				for (const item of await load()) {
					event.currentTarget.append(item);
				}
			};
		`,
		// Before an `await` in a loop body
		outdent`
			element.onclick = async event => {
				while (condition) {
					event.currentTarget.click();
					await promise;
				}
			};
		`,
		// Before a `yield` in a generator handler's loop body
		outdent`
			element.onclick = function * (event) {
				while (condition) {
					event.currentTarget.click();
					yield promise;
				}
			};
		`,
		// In a loop condition that repeats after an `await` in the body
		outdent`
			element.onclick = async event => {
				while (event.currentTarget.isConnected) {
					await promise;
				}
			};
		`,
		// Assignment target read after a prior `await` (unlike the valid case with no prior `await`)
		outdent`
			element.onclick = async event => {
				await step1;
				event.currentTarget.href = await getUrl();
			};
		`,
		// After an `await` inside a `try` block
		outdent`
			element.onclick = async event => {
				try {
					await somePromise;
				} catch {}
				event.currentTarget.disabled = false;
			};
		`,
		// Deeply nested function
		outdent`
			element.onclick = event => {
				setTimeout(() => {
					requestAnimationFrame(() => {
						event.currentTarget.focus();
					});
				});
			};
		`,
		// Nested async callback with its own `await` is reported as nested, not after-suspension
		outdent`
			element.onclick = event => {
				button.addEventListener("click", async () => {
					await somePromise;
					event.currentTarget.foo();
				});
			};
		`,
	],
});
