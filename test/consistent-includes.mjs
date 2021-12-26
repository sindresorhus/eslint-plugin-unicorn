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
		// Different arrays
		'[1, 2].includes(foo) || [2, 3].includes(bar)',
		// MinListItems should work
		{code: '[1, 2, 3].includes(foo)', options: [{minListItems: 3}]},
		'foo !== null && foo !== undefined',
	],
	invalid: [
		'foo === 1 || foo === "str" || foo === true',
		// Binary || Flipped Binary || Binary
		'foo === 1 || "str" === foo || foo === false',
		'bar === 1 || foo !== 1 || foo !== 2',
		// Binary || Array#includes
		'foo === 1 || [2, 3].includes(foo)',
		// Array#includes || Binary
		'[4, 5].includes(foo) || foo === 6',
		// Binary || Not Binary || Not Array#includes
		'foo === null || foo !== 7 || ![8, 9].includes(foo)',
		// Array#includes || Array#includes
		'[1, 2].includes(foo) || [3, 4].includes(foo)',
		'![3, 4].includes(foo) || ![5, 6].includes(foo)',
		'!![null, undefined].includes(foo) || !![true, false].includes(foo)',
		'!!![7, 8].includes(foo) || !!![9, 0].includes(foo)',
		'(a && b) || d || c !== null || foo === 1 || foo === 2 || [3, 4].includes(foo)',
		'bar === true || foo === true || foo === 1 || foo === 2',
		// Multiple reduce expressions
		'foo !== 1 || ![2, 3].includes(foo) || foo !== 3 || bar === true || false === bar || baz === 3',
		// Object with property
		'foo.bar?.baz === 1 || [2, 3].includes(foo.bar.baz)',
		// Must stop in array iteration
		'foo === true || foo === null || [1, 2].includes(bar) || foo === false',
		{code: '[1, 2, 3].includes(foo)', options: [{minListItems: 4}]},
		{code: '!!![1, 2, 3].includes(foo)', options: [{minListItems: 4}]},
		// MinListItems should work
		{code: 'foo === 1 || foo === 2 || bar === true || bar === false || bar === null', options: [{minListItems: 3}]},
		{code: '["one"].includes(foo) || [].includes(foo) || [2, 3].includes(foo)', options: [{minListItems: 4}]},
		// Should remove parentheses
		'node.type === "LogicalExpression" && (((( node.operator === "||" || node.operator === "??" )))) || node.type === "ConditionalExpression" || node.type === "AssignmentExpression"',
		// Should add parentheses
		{code: 'bar === true && [1, 2, 3].includes(foo) && baz === false', options: [{minListItems: 4}]},
	],
});
