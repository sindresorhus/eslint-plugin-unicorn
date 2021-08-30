import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);
const space = '';
const tab = '	';

test.snapshot({
	valid: [
		'const x = 0;',
		'\'use strict\'; const x = 0;',
		';; const x = 0;',
		'{{{;;\'use strict\'; const x = 0;}}}',
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
		';;\'use strict\';',
		'{}',
		'{;;}',
		'{\'use strict\';}',
		'{{}}',
	],
});
