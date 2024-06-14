import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'!foo instanceof bar',
		'+foo === bar',
		'!(foo === bar)',
		'!!foo === bar',
		'!!!foo === bar',
		// We are not checking right side
		'foo === !bar',
	],
	invalid: [
		'!foo === bar',
		'!foo !== bar',
		'!foo == bar',
		'!foo != bar',
		outdent`
			function x() {
				return!foo === bar;
			}
		`,
		outdent`
			function x() {
				return!
					foo === bar;
				throw!
					foo === bar;
			}
		`,
		outdent`
			foo
			!(a) === b
		`,
		outdent`
			foo
			![a, b].join('') === c
		`,
		outdent`
			foo
			! [a, b].join('') === c
		`,
		outdent`
			foo
			!/* comment */[a, b].join('') === c
		`,
	],
});
