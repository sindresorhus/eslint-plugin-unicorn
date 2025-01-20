import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo ? foo1 : bar;',
		'foo.bar ? foo.bar1 : foo.baz',
		'foo.bar ? foo1.bar : foo.baz',
		'++foo ? ++foo : bar;',

		// Not checking
		'!!bar ? foo : bar;',
	],
	invalid: [
		'foo ? foo : bar;',
		'foo.bar ? foo.bar : foo.baz',
		'foo?.bar ? foo.bar : baz',
		'!bar ? foo : bar;',
		'!!bar ? foo : !bar;',

		'foo() ? foo() : bar',

		// Children parentheses
		'foo ? foo : a && b',
		'foo ? foo : a || b',
		'foo ? foo : a ?? b',
		'a && b ? a && b : bar',
		'a || b ? a || b : bar',
		'a ?? b ? a ?? b : bar',
		'foo ? foo : await a',
		'await a ? await a : foo',

		// ASI
		outdent`
			const foo = []
			!+a ? b : +a
		`,
		outdent`
			const foo = []
			a && b ? a && b : 1
		`,
	],
});
