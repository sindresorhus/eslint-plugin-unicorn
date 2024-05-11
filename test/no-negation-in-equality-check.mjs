import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
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
	],
});
