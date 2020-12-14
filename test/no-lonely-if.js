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
	outdent`
		if (a) {
			if (b) {
				// Should not report
			}
		} else if (c) {
			if (d) {
			}
		}
	`
]);
