import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'queueMicrotask(callback);',
		'process.nextTick?.(callback);',
		'process?.nextTick(callback);',
		'process["nextTick"](callback);',
		'const process = {nextTick: callback => callback()}; process.nextTick(callback);',
		'const process = await import("node:process"); process.nextTick(callback);',
		'const object = {process: {nextTick: callback => callback()}}; object.process.nextTick(callback);',
		'const {nextTick} = process; nextTick(callback);',
		'import {nextTick} from "node:process"; nextTick(callback);',
		'setImmediate(callback);',
		'setTimeout(callback, 0);',
		{
			code: 'setImmediate?.(callback);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'setImmediate("callback()");',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'setImmediate(...argumentsArray);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'const setImmediate = callback => callback(); setImmediate(callback);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'globalThis.setImmediate(callback);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'window.setTimeout(callback, 0);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, 1);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout("callback()", 0);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(...argumentsArray);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, delay);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'const timeout = setTimeout(callback, 0);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'const immediate = setImmediate(callback);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'const setTimeout = (callback, delay) => callback(delay); setTimeout(callback, 0);',
			options: [{checkSetTimeout: true}],
		},
	],
	invalid: [
		'process.nextTick(callback);',
		'const result = process.nextTick(callback);',
		'process /* keep */ .nextTick(callback);',
		'process.nextTick(...argumentsArray);',
		'process.nextTick(callback, value);',
		'const tick = process.nextTick;',
		'foo(process.nextTick);',
		'process.nextTick;',
		{
			code: 'setImmediate(callback);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'setImmediate(callback, value);',
			options: [{checkSetImmediate: true}],
		},
		{
			code: 'setTimeout(callback, 0);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, 0, value);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, /* delay */ 0);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, 0 /* delay */);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, 0 // delay\n);',
			options: [{checkSetTimeout: true}],
		},
		{
			code: 'setTimeout(callback, 0,);',
			options: [{checkSetTimeout: true}],
		},
		{
			// A comment between the trailing comma and `)` is inside the removal range.
			code: 'setTimeout(callback, 0, /* trailing */);',
			options: [{checkSetTimeout: true}],
		},
		{
			// A comment before the comma is outside the removal range and is preserved.
			code: 'setTimeout(callback /* keep */, 0);',
			options: [{checkSetTimeout: true}],
		},
	],
});
