import {outdent} from 'outdent';
import {test} from './utils/test';

test({
	valid: [
		outdent`
			if (a) {
				if (b) {
				}
			} else {}
		`,
		outdent`
			if (a) {
				if (b) {
				}
				foo();
			} else {}
		`,
		outdent`
			if (a) {
			} else {
				if (y) {}
			}
		`,
		outdent`
			if (a) {
				b ? c() : d()
			}
		`
	],
	invalid: []
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
	'if (((a || b))) if (((c || d)));',
	// Comments
	outdent`
		if /* will keep */
		(
			/* will keep */
			a /* will keep */
				.b /* will keep */
		) /* keep */{
			/* will remove */
			if (
				/* will remove */
				c /* will keep */
					.d /* will remove */
			) {
				/* will keep */
				foo();
				/* will keep */
			}
			/* will remove */
		}
	`,
	// Semicolon
	outdent`
		if (a) {
			if (b) foo()
		}
		[].forEach(bar)
	`,
	outdent`
		if (a)
			if (b) foo()
		;[].forEach(bar)
	`
]);
