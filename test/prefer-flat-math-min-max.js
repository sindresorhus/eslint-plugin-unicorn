import {outdent} from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Math.max(a, b, c);',
		'Math.min(a, b, c);',
		'Math.max(Math.min(a, b), c);',
		'Math.min(Math.max(a, b), c);',
		'max(max(a, b), c);',
		'Math.max.apply(Math, [Math.max(a, b), c]);',
		'Math["max"](Math["max"](a, b), c);',
		'Math.max?.(Math.max(a, b), c);',
		'Math?.max(Math.max(a, b), c);',
		'Math.max(Math.max?.(a, b), c);',
		'Math.max(Math?.max(a, b), c);',
		'globalThis.Math.max(Math.max(a, b), c);',
		'Number.max(Number.max(a, b), c);',
		'Math.hypot(Math.hypot(a, b), c);',
	],
	invalid: [
		'Math.max(Math.max(a, b), c);',
		'Math.min(a, Math.min(b, c));',
		'Math.max(Math.max(a, b), Math.max(c, d), e);',
		'Math.min(Math.min(Math.min(a, b), c), d);',
		'Math.max(Math.max(a, b));',
		'Math.min(Math.min());',
		'Math.max(Math.max(...values), fallback);',
		'const value = Math.max(foo, Math.max(bar, baz)).toString();',
		'const value = Math.min((Math.min(a, b)), c);',
		outdent`
			const value = Math.max(
				Math.max(a, b),
				c,
			);
		`,
		outdent`
			const value = Math.max(
				Math.max(
					a,
					b,
				),
				c,
			);
		`,
		outdent`
			const value = Math.max(
				Math.max(/* keep */ a, b),
				c,
			);
		`,
	],
});
