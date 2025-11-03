import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID_MISSING_DELAY = 'missing-delay';
const MESSAGE_ID_REDUNDANT_DELAY = 'redundant-delay';

test({
	valid: [
		'setTimeout(() => console.log("Hello"), 0);',
		'setInterval(callback, 0);',
		'setTimeout(() => console.log("Hello"), 1000);',
		'setInterval(callback, 100);',
		'window.setTimeout(() => console.log("Hello"), 0);',
		'globalThis.setInterval(callback, 0);',
		'global.setTimeout(() => {}, 0);',
		'setTimeout(callback, 0, arg1, arg2);',
		'setInterval(callback, 100, arg1);',
		outdent`
			import {setTimeout as delay} from 'node:timers/promises';

			await delay(100);
		`,
		'setTimeout?.(() => {});',
		'window.setTimeout?.(callback);',
		'setTimeout();',
		'customSetTimeout(callback);',
		'obj.customSetTimeout(callback);',
		{
			code: 'setTimeout(() => console.log("Hello"));',
			options: ['never'],
		},
		{
			code: 'setInterval(callback);',
			options: ['never'],
		},
		{
			code: 'window.setTimeout(() => console.log("Hello"));',
			options: ['never'],
		},
		{
			code: 'globalThis.setInterval(callback);',
			options: ['never'],
		},
		{
			code: 'setTimeout(() => console.log("Hello"), 1000);',
			options: ['never'],
		},
		{
			code: 'setInterval(callback, 100);',
			options: ['never'],
		},
		{
			code: 'setTimeout(callback, 500, arg1);',
			options: ['never'],
		},
	],
	invalid: [
		{
			code: 'setTimeout(() => console.log("Hello"));',
			output: 'setTimeout(() => console.log("Hello"), 0);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'setInterval(callback);',
			output: 'setInterval(callback, 0);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setInterval'},
			}],
		},
		{
			code: 'window.setTimeout(() => console.log("Hello"));',
			output: 'window.setTimeout(() => console.log("Hello"), 0);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'globalThis.setInterval(callback);',
			output: 'globalThis.setInterval(callback, 0);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setInterval'},
			}],
		},
		{
			code: 'global.setTimeout(fn);',
			output: 'global.setTimeout(fn, 0);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: outdent`
				setTimeout(
					() => console.log("Hello")
				);
			`,
			output: outdent`
				setTimeout(
					() => console.log("Hello"), 0
				);
			`,
			errors: [{messageId: MESSAGE_ID_MISSING_DELAY}],
		},
		{
			code: outdent`
				setInterval(
					callback
				);
			`,
			output: outdent`
				setInterval(
					callback, 0
				);
			`,
			errors: [{messageId: MESSAGE_ID_MISSING_DELAY}],
		},
		{
			code: 'setTimeout(...args);',
			errors: [{
				messageId: MESSAGE_ID_MISSING_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'setTimeout(() => console.log("Hello"), 0);',
			output: 'setTimeout(() => console.log("Hello"));',
			options: ['never'],
			errors: [{
				messageId: MESSAGE_ID_REDUNDANT_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'setInterval(callback, 0);',
			output: 'setInterval(callback);',
			options: ['never'],
			errors: [{
				messageId: MESSAGE_ID_REDUNDANT_DELAY,
				data: {name: 'setInterval'},
			}],
		},
		{
			code: 'window.setTimeout(() => console.log("Hello"), 0);',
			output: 'window.setTimeout(() => console.log("Hello"));',
			options: ['never'],
			errors: [{
				messageId: MESSAGE_ID_REDUNDANT_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'globalThis.setInterval(callback, 0);',
			output: 'globalThis.setInterval(callback);',
			options: ['never'],
			errors: [{
				messageId: MESSAGE_ID_REDUNDANT_DELAY,
				data: {name: 'setInterval'},
			}],
		},
		{
			code: 'global.setTimeout(fn, 0);',
			output: 'global.setTimeout(fn);',
			options: ['never'],
			errors: [{
				messageId: MESSAGE_ID_REDUNDANT_DELAY,
				data: {name: 'setTimeout'},
			}],
		},
		{
			code: 'setTimeout(() => console.log("Hello"), -0);',
			output: 'setTimeout(() => console.log("Hello"));',
			options: ['never'],
			errors: [{messageId: MESSAGE_ID_REDUNDANT_DELAY}],
		},
		{
			code: outdent`
				setTimeout(
					() => console.log("Hello"),
					0
				);
			`,
			output: outdent`
				setTimeout(
					() => console.log("Hello")
				);
			`,
			options: ['never'],
			errors: [{messageId: MESSAGE_ID_REDUNDANT_DELAY}],
		},
		{
			code: outdent`
				setInterval(
					callback,
					0
				);
			`,
			output: outdent`
				setInterval(
					callback
				);
			`,
			options: ['never'],
			errors: [{messageId: MESSAGE_ID_REDUNDANT_DELAY}],
		},
		{
			code: 'setTimeout(callback, 0, arg1, arg2);',
			output: 'setTimeout(callback, arg1, arg2);',
			options: ['never'],
			errors: [{messageId: MESSAGE_ID_REDUNDANT_DELAY}],
		},
	],
});
