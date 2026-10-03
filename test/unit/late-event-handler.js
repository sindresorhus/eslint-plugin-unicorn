import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../../index.js';

const linter = new Linter();

// `createLateEventHandlerTracker()` needs the Unicorn rule context, so test it through a rule that uses it
const getMessageIds = code => linter.verify(code, {
	plugins: {unicorn},
	rules: {'unicorn/no-late-event-control': 'error'},
}).map(message => message.messageId);

test('an event control call before a suspension point in a loop runs late on the next iteration', t => {
	t.assert.deepStrictEqual(getMessageIds('async function onClick(event) { for (const key in object) { event.preventDefault(); await foo(); } }'), ['after-suspension']);
	t.assert.deepStrictEqual(getMessageIds('async function onClick(event) { do { event.preventDefault(); await foo(); } while (bar); }'), ['after-suspension']);
});

test('the right side of a `for…in` loop runs once', t => {
	t.assert.deepStrictEqual(getMessageIds('async function onClick(event) { for (const key in event.preventDefault()) { await foo(); } }'), []);
});

test('a top-level `await` does not suspend a handler', t => {
	t.assert.deepStrictEqual(getMessageIds('await foo; function onClick(event) { event.preventDefault(); }'), []);
});
