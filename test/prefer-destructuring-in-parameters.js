import {outdent} from 'outdent';
import {test} from './utils/test.js';

test.snapshot({
	valid: [
		'const foo = bar => bar',
		'const foo = function bar(baz) {return bar.name}',
		'const foo = ({bar}) => bar',
		'const foo = bar => bar[3]',
		'const foo = bar => bar[1.5]',
		'const foo = bar => bar[-1]',
		'const foo = bar => bar[0xFF]',
		'const foo = bar => bar[null]',
		'const foo = bar => bar[1n]',
		'const foo = bar => bar["baz"]',
		'const foo = bar => bar.length && bar[0]',
		'const foo = bar => bar.default',
		'const foo = bar => bar.function',
	],
	invalid: [
		'const foo = bar => bar[0]',
		'const foo = bar => bar[0] === firstElementOfBar',
		'const foo = (bar) => bar[0]',
		'const foo = (bar, {baz}) => bar[0] === baz',
		'const foo = bar => bar[0b01]',
		'const foo = bar => bar.length',
		'const foo = bar => bar.baz'
	]
});
