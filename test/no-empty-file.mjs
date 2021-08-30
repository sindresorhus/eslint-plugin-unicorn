import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);
const space = '';
const tab = '	';

test.snapshot({
	valid: [
		'const foo = "🦄";',
	],
	invalid: [
		'',
		space,
		tab,
		'\n',
		'\r',
		'\r\n',
		outdent`


		`,
		'// comment',
		'/* comment */',
		'\'use strict\';',
		';',
		';;',
		';;\'use strict\';'
	],
});
