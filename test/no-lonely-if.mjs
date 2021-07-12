import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
		`,
	],
	invalid: [],
});

test.snapshot({
	valid: [],
	invalid: [
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
			if // 1
			(
				// 2
				a // 3
					.b // 4
			) // 5
			{
				// 6
				if (
					// 7
					c // 8
						.d // 9
				) {
					// 10
					foo();
					// 11
				}
				// 12
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
		`,
		outdent`
			if (a) {
				if (b) foo()
			}
			;[].forEach(bar)
		`,
	],
});
