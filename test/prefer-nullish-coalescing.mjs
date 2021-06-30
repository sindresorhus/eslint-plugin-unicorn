import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const a = 0; const foo = a || 1;',
		'const a = {b: false}; const foo = a.b || 1;',
		'const foo = 0n || 1;',
		'const foo = "" || 1;',
		'const foo = `` || 1;',
		'const foo = NaN || 1;',
		// Boolean
		'const foo = !(a || b)',
		'const foo = Boolean(a || b)',
		'if (a || b);',
		'const foo = (a || b) ? c : d;',
		'while (a || b);',
		'do {} while (a || b);',
		'for (;a || b;);',
		// Mixed
		'const foo = a || (b && c)',
		'const foo = (a || b) && c',
		'const foo = a ?? (b || c)',
		'const foo = (a ?? b) || c'
	],
	invalid: [
		'const foo = a || b',
		'foo ||= b',
		'const foo = (( a )) || b'
	]
});
