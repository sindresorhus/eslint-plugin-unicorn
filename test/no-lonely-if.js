import {outdent} from 'outdent';
import {test} from './utils/test';

test({
	valid: [],
	invalid: [
	]
});

test.visualize([
	outdent`
		if (a) {
			if (b) {
			}
		}
	`,
	// Inner one is `BlockStatement`
	outdent`
		if (a) if (b) {
			foo();
		}
	`,
	// Outer one is `BlockStatement`
	outdent`
		if (a) {
			if (b) foo();
		}
	`,
	// No `BlockStatement`
	'if (a) if (b) foo();',
	// `EmptyStatement`
	'if (a) if (b);',
	// Nested
	outdent`
		if (a) {
			if (b) {
				// Should not report
			}
		} else if (c) {
			if (d) {
			}
		}
	`,
	// Need parenthesis
	outdent`
		function * foo() {
			if (a || b)
			if (a ?? b)
			if (a ? b : c)
			if (a = b)
			if (a += b)
			if (a -= b)
			if (a &&= b)
			if (yield a)
			if (a, b);
		}
	`,
	// Should not add parenthesis
	outdent`
		async function foo() {
			if (a)
			if (await a)
			if (a.b)
			if (a && b);
		}
	`,
	// Don't case parenthesis in outer test
	'if (((a || b))) if (((c || d)));'
]);
