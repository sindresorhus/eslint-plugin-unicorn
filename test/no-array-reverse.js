import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const FORBID_EXPRESSION_OPTIONS = [{allowExpressionStatement: false}];

test.snapshot({
	valid: [
		'reversed =[...array].toReversed()',
		'reversed =array.toReversed()',
		'reversed =[...array].reverse',
		'reversed =[...array].reverse?.()',
		'array.reverse()',
		'array.reverse?.()',
		'array?.reverse()',
		'if (true) array.reverse()',
		'reversed = array.reverse(extraArgument)',
	],
	invalid: [
		'reversed = [...array].reverse()',
		'reversed = [...array]?.reverse()',
		'reversed = array.reverse()',
		'reversed = array?.reverse()',
		{
			code: 'array.reverse()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		{
			code: 'array?.reverse()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		// Don't care about `allowExpression`
		{
			code: '[...array].reverse()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		'reversed = [...(0, array)].reverse()',
	],
});
