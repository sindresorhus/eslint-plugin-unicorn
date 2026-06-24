import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// Synchronous calls in the handler
		'element.addEventListener("click", event => { event.preventDefault(); });',
		'element.addEventListener("click", event => { event.stopPropagation(); });',
		'element.addEventListener("click", event => { event.stopImmediatePropagation(); });',
		// Calls before the `await`
		outdent`
			element.addEventListener("click", async event => {
				event.preventDefault();
				await somePromise;
			});
		`,
		// Argument of an awaited call is evaluated synchronously
		'element.onclick = async event => { await foo(event.preventDefault()); };',
		// A synchronous argument is evaluated before a later awaited argument in the same call
		'element.onclick = async event => { log(event.stopPropagation(), await ready()); };',
		// The iterable expression is evaluated before the `for await...of` suspension
		'element.onclick = async event => { for await (const chunk of event.preventDefault()) { log(chunk); } };',
		// The `for...of` iterable is evaluated once before the awaiting loop body
		outdent`
			element.onclick = async event => {
				for (const child of event.preventDefault()) {
					await render(child);
				}
			};
		`,
		// Object is not a parameter
		'async function handler() { const event = getEvent(); await somePromise; event.preventDefault(); }',
		// Different method
		'async event => { await somePromise; event.composedPath(); }',
		// Computed access is not matched
		'async event => { await somePromise; event["preventDefault"](); }',
		// Aliased method is not matched
		'async event => { const method = event.preventDefault; await somePromise; method(); }',
		// Destructured method is not matched
		'async event => { const {preventDefault} = event; await somePromise; preventDefault(); }',
		// Global `event` does not resolve to a parameter
		'async () => { await somePromise; event.preventDefault(); }',
		// A shadowing inner parameter is called synchronously, even while the outer handler is suspended
		outdent`
			async function outer(event) {
				await somePromise;
				element.addEventListener("click", event => {
					event.preventDefault();
				});
			}
		`,
		// An `await` confined to a nested callback does not affect the handler
		outdent`
			element.onclick = event => {
				promise.then(async () => {
					await somePromise;
				});
				event.preventDefault();
			};
		`,
		// Non-event parameters can have event-control-like methods
		typeAware(outdent`
			type Control = {
				preventDefault(): void;
			};

			async function updateControl(event: Control) {
				await event.load();
				event.preventDefault();
			}
		`),
	],
	invalid: [
		// After `await`
		outdent`
			element.addEventListener("click", async event => {
				await somePromise;
				event.preventDefault();
			});
		`,
		outdent`
			element.addEventListener("click", async event => {
				await somePromise;
				event.stopPropagation();
			});
		`,
		outdent`
			element.addEventListener("click", async event => {
				await somePromise;
				event.stopImmediatePropagation();
			});
		`,
		// After `yield` in a generator handler, the dispatch has likewise finished
		outdent`
			element.onclick = function * (event) {
				yield somePromise;
				event.preventDefault();
			};
		`,
		// A yielded argument suspends before the event-control method is called
		'element.onclick = function * (event) { event.stopPropagation(yield ready); };',
		// Short parameter name
		'element.onclick = async e => { await somePromise; e.preventDefault(); };',
		// Event-like camelCase parameter name
		'element.onclick = async mouseDownEvent => { await somePromise; mouseDownEvent.stopPropagation(); };',
		// An earlier awaited argument suspends before a later argument in the same call
		'element.onclick = async event => { log(await ready(), event.preventDefault()); };',
		// An awaited argument suspends before the event-control method is called
		'element.onclick = async event => { event.preventDefault(await ready()); };',
		// Issue example: only the call after the `await` is reported
		outdent`
			element.onclick = async event => {
				event.preventDefault();
				await somePromise;
				event.stopPropagation();
			};
		`,
		// Generator handler bodies are not called during dispatch
		'element.onclick = function * (event) { event.preventDefault(); yield somePromise; };',
		// Nested function (implicit return)
		'element.onclick = event => setTimeout(() => event.preventDefault());',
		// Nested function (block body)
		outdent`
			element.onclick = event => {
				setTimeout(() => {
					event.stopPropagation();
				}, 1);
			};
		`,
		// Nested function in a `.then()` callback
		'element.onclick = event => { fetch(url).then(() => event.stopImmediatePropagation()); };',
		// Optional chaining after `await`
		'async event => { await somePromise; event?.preventDefault(); }',
		// Named function declaration handler
		outdent`
			async function handleClick(event) {
				await somePromise;
				event.preventDefault();
			}
		`,
		// After a `for await...of` loop
		outdent`
			element.onclick = async event => {
				for await (const chunk of stream) {
					log(chunk);
				}
				event.preventDefault();
			};
		`,
		// Inside a `for await...of` loop body
		outdent`
			element.onclick = async event => {
				for await (const chunk of stream) {
					event.preventDefault();
				}
			};
		`,
		// The `for...of` iterable is awaited, so the loop body runs after suspension
		outdent`
			element.onclick = async event => {
				for (const item of await load()) {
					event.preventDefault();
				}
			};
		`,
		// Before an `await` in a loop body
		outdent`
			element.onclick = async event => {
				while (condition) {
					event.preventDefault();
					await promise;
				}
			};
		`,
		// In a loop condition that repeats after an `await` in the body
		outdent`
			element.onclick = async event => {
				while (event.preventDefault()) {
					await promise;
				}
			};
		`,
		// After an `await` inside a `try` block
		outdent`
			element.onclick = async event => {
				try {
					await somePromise;
				} catch {}
				event.preventDefault();
			};
		`,
		// Deeply nested function
		outdent`
			element.onclick = event => {
				setTimeout(() => {
					requestAnimationFrame(() => {
						event.preventDefault();
					});
				});
			};
		`,
		// Nested async callback with its own `await` is reported as nested, not after-suspension
		outdent`
			element.onclick = event => {
				button.addEventListener("click", async () => {
					await somePromise;
					event.preventDefault();
				});
			};
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		'async function updateControl(event: {preventDefault(): void}) { await load(); event.preventDefault(); }',
		'async function updateControl(event: string) { await load(); event.preventDefault(); }',
		'type Event = string; async function updateControl(event: Event) { await load(); event.preventDefault(); }',
		'type SyntheticEvent = string; async function updateControl(value: SyntheticEvent) { await load(); value.preventDefault(); }',
		'namespace React { export type SyntheticEvent = string } async function updateControl(value: React.SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type {SyntheticEvent} from "not-react"; async function updateControl(value: SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type * as React from "not-react"; async function updateControl(value: React.SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type * as React from "react"; async function updateControl(value: React.NotEvent) { await load(); value.preventDefault(); }',
	],
	invalid: [
		'async function handleClick(event: Event) { await load(); event.preventDefault(); }',
		'async function handleClick(event: MouseEvent) { await load(); event.stopPropagation(); }',
		'import React from "react"; async function handleClick(value: React.SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type React from "react"; async function handleClick(value: React.SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type * as React from "react"; async function handleClick(event: React.SyntheticEvent) { await load(); event.stopImmediatePropagation(); }',
		'import type * as React from "react"; async function handleClick(value: React.AnimationEvent) { await load(); value.preventDefault(); }',
		'import type * as React from "react"; async function handleClick(value: React.InvalidEvent) { await load(); value.preventDefault(); }',
		'import type * as React from "react"; async function handleClick(value: React.TransitionEvent) { await load(); value.preventDefault(); }',
		'async function handleClick(mouseDownEvent: unknown) { await load(); mouseDownEvent.preventDefault(); }',
		'async function handleClick(value: Event | MouseEvent) { await load(); value.preventDefault(); }',
		'async function handleClick(change: PictureInPictureEvent) { await load(); change.stopPropagation(); }',
		'async function handleClick(request: FetchEvent) { await load(); request.preventDefault(); }',
		'async function handleClick(value: Event) { await load(); value!.preventDefault(); }',
		'async function handleClick(value: Event) { await load(); (value as Event).stopPropagation(); }',
		'async function handleClick(value: Event) { await load(); (<Event>value).stopImmediatePropagation(); }',
		'import type {SyntheticEvent} from "react"; async function handleClick(value: SyntheticEvent) { await load(); value.preventDefault(); }',
		'import type {SyntheticEvent as SE} from "react"; async function handleClick(value: SE) { await load(); value.preventDefault(); }',
		'import type {ChangeEvent} from "react"; async function handleClick(value: ChangeEvent<HTMLInputElement>) { await load(); value.preventDefault(); }',
	],
});
