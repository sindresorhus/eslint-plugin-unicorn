import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
	],
	invalid: [
		'foo ? foo : bar;',
		'foo.bar ? foo.bar : foo.baz',
		'foo?.bar ? foo.bar : baz',
		'!bar ? foo : bar;',
	],
});
