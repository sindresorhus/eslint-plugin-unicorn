import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const FORBID_EXPRESSION_OPTIONS = [{allowExpressionStatement: false}];

test.snapshot({
	valid: [
		'sorted =[...array].toSorted()',
		'sorted =array.toSorted()',
		'sorted =[...array].sort',
		'sorted =[...array].sort?.()',
		'array.sort()',
		'array.sort?.()',
		'array?.sort()',
		'if (true) array.sort()',
		'sorted = array.sort(...[])',
		'sorted = array.sort(...[compareFn])',
		'sorted = array.sort(compareFn, extraArgument)',
	],
	invalid: [
		'sorted = [...array].sort()',
		'sorted = [...array]?.sort()',
		'sorted = array.sort()',
		'sorted = array?.sort()',
		'sorted = [...array].sort(compareFn)',
		'sorted = [...array]?.sort(compareFn)',
		'sorted = array.sort(compareFn)',
		'sorted = array?.sort(compareFn)',
		{
			code: 'array.sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		{
			code: 'array?.sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		// Don't care about `allowExpression`
		{
			code: '[...array].sort()',
			options: FORBID_EXPRESSION_OPTIONS,
		},
		'sorted = [...(0, array)].sort()',
	],
});
