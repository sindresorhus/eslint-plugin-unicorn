import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'const x = 0;',
		'function init() {}',
		'class Foo {}',
		'import "side-effect";',
		'export {foo};',
		'export const foo = 1;',
		'export default function () {}',
		'export default 1;',
		'"use strict";',
		'const response = fetch();',
		'const details = new Map();',
	],
	invalid: [
		{
			code: 'document.title = "gone";',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'init();',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'if (foo) bar();',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'for (const item of items) doThing(item);',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'export default foo();',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
		{
			code: 'throw new Error("boom");',
			errors: [{messageId: 'no-top-level-side-effects'}],
		},
	],
});
