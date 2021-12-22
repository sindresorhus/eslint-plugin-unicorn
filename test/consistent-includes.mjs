import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo == 1 || foo == 2 || foo == 3',
		'foo != 1 || foo != 2 || foo != 3',
		'foo === 1 || foo == 2 || foo === 3',
		'foo === 1 || foo !== 2 || foo === 3',
		'foo !== 1 || [2, 3].includes(foo)',
		'[1, 2].includes(foo) || foo !== 3',
		'foo === 1 || ![2, 3].includes(foo)',
		'![1, 2].includes(foo) || foo === 3',
		'foo == 1 || [2, 3].includes(foo)',
		'[2, 3].includes(foo) || foo == 1',
		'[1, 2].includes(foo) || ![3, 4].includes(foo)',
		'![1, 2].includes(foo) || [3, 4].includes(foo)',
		'[1, 2].includes(foo) || [2, 3].includes(bar)', // Different arrays
		{code: '[1, 2, 3].includes(foo)', options: [{minListItems: 3}]}, // MinListItems should work
		'foo !== null && foo !== undefined',
	],
	invalid: [
		'foo === 1 || foo === "str" || foo === true',
		'foo === 1 || "str" === foo || foo === false', // Binary || Flipped Binary || Binary
		'bar === 1 || foo !== 1 || foo !== 2',
		'foo === 1 || [2, 3].includes(foo)', // Binary || Array#includes
		'[4, 5].includes(foo) || foo === 6', // Array#includes || Binary
		'foo === null || foo !== 7 || ![8, 9].includes(foo)', // Binary || Not Binary || Not Array#includes
		'[1, 2].includes(foo) || [3, 4].includes(foo)', // Array#includes || Array#includes
		'![3, 4].includes(foo) || ![5, 6].includes(foo)',
		'!![null, undefined].includes(foo) || !![true, false].includes(foo)',
		'!!![7, 8].includes(foo) || !!![9, 0].includes(foo)',
		'(a && b) || d || c !== null || foo === 1 || foo === 2 || [3, 4].includes(foo)',
		'bar === true || foo === true || foo === 1 || foo === 2',
		'foo !== 1 || ![2, 3].includes(foo) || foo !== 3 || bar === true || false === bar || baz === 3', // Multiple reduce expressions
		'foo.bar?.baz === 1 || [2, 3].includes(foo.bar.baz)', // Object with property
		'foo === true || foo === null || [1, 2].includes(bar) || foo === false', // Must stop in array iteration
		{code: '[1, 2, 3].includes(foo)', options: [{minListItems: 4}]},
		{code: '!!![1, 2, 3].includes(foo)', options: [{minListItems: 4}]},
		{code: 'foo === 1 || foo === 2 || bar === true || bar === false || bar === null', options: [{minListItems: 3}]}, // MinListItems should work
		{code: '["one"].includes(foo) || [].includes(foo) || [2, 3].includes(foo)', options: [{minListItems: 4}]},
		'node.type === "LogicalExpression" && (node.operator === "||" || node.operator === "??") || node.type === "ConditionalExpression" || node.type === "AssignmentExpression"',
	],
});
