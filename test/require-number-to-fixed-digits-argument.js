import {getTester} from './utils/test.js';

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

		// `callee` is a `NewExpression`
		'new BigNumber(1).toFixed()',
		'new Number(1).toFixed()',
	],
	invalid: [
		'const string = number.toFixed();',
		'const string = number.toFixed( /* comment */ );',
		'Number(1).toFixed()',

		// False positive cases
		'const bigNumber = new BigNumber(1); const string = bigNumber.toFixed();',
	],
});
