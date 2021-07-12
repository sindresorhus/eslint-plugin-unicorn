import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'number.toFixed(0)',
		'number.toFixed(...[])',
		'number.toFixed(2)',
		'number.toFixed(1,2,3)',
		'number[toFixed]()',
		'number["toFixed"]()',
		'number?.toFixed()',
		'number.toFixed?.()',
		'number.notToFixed();',
	],
	invalid: [
		'const string = number.toFixed();',
		'const string = number.toFixed( /* comment */ );',
	],
});
