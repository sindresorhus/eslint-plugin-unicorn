import {test} from './utils/test';

function testCase(code, nonZeroType, messageIds, output) {
	return {
		code,
		output: output || code,
		errors: (messageIds || []).map(messageId => ({messageId})),
		options: nonZeroType ? [{
			'non-zero': nonZeroType
		}] : []
	};
}

test({
	valid: [
		testCase('array.foo'),
		testCase('array.length'),
		testCase('array.length === 0'),
		testCase('array.length !== 0'),
		testCase('array.length > 0'),
		testCase('if (array.foo) {}'),
		testCase('if (length) {}'),
		testCase('if ([].length > 0) {}'),
		testCase('if ("".length > 0) {}'),
		testCase('if (array.length === 0) {}'),
		testCase('if (array.length == 0) {}'),
		testCase('if (array.length === 1) {}'),
		testCase('if (array.length <= 1) {}'),
		testCase('if (array.length > 1) {}'),
		testCase('if (array.length < 2) {}'),
		testCase('const foo = [].length === 0 ? null : undefined'),
		testCase('array.length', 'not-equal'),
		testCase('array.length > 0', 'not-equal'),
		testCase('array.length >= 1', 'not-equal'),
		testCase('if ("".length !== 0) {}', 'not-equal'),
		testCase('if ([].length === 0) {}', 'not-equal'),
		testCase('if ([].length === 1) {}', 'not-equal'),
		testCase('if ([].length <= 1) {}', 'not-equal'),
		testCase('if ("".length == 0) {}', 'not-equal'),
		testCase('array.length !== 0', 'greater-than'),
		testCase('array.length >= 1', 'greater-than'),
		testCase('if ("".length > 0) {}', 'greater-than'),
		testCase('if ("".length >= 0) {}', 'greater-than'),
		testCase('if ("".length >= 2) {}', 'greater-than'),
		testCase('if ("".length >= 1) {}', 'greater-than-or-equal'),
		testCase('array.length !== 0', 'greater-than-or-equal'),
		testCase('array.length > 0', 'greater-than-or-equal'),
		testCase('if ("".length === 0) {}', 'greater-than-or-equal'),
		testCase('if ("".length > 2) {}', 'greater-than-or-equal'),
		testCase('if ("".length === 2) {}', 'greater-than-or-equal'),
		testCase('if ("".length === 0 && array.length >= 1) {}', 'greater-than-or-equal'),
		testCase('if ("".length === 0 && array.length > 0) {}', 'greater-than'),
		testCase('if ("".length === 0 && array.length !== 0) {}', 'not-equal'),
		testCase('if (foo[length]) {}')
	],
	invalid: [
		testCase(
			'if ([].length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if ("".length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (array.length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (!array.length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (array.foo.length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (!!array.length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (array.length && array[0] === 1) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (array[0] === 1 || array.length) {}',
			undefined,
			['compareToValue']
		),
		testCase(
			'if (array.length < 1) {}',
			undefined,
			['zeroEqual'],
			'if (array.length === 0) {}'
		),
		testCase(
			'if (array.length<1) {}',
			undefined,
			['zeroEqual'],
			'if (array.length === 0) {}'
		),
		testCase(
			'if (array.length !== 0) {}',
			undefined,
			['nonZeroGreater'],
			'if (array.length > 0) {}'
		),
		testCase(
			'if (array.length !== 0 && array[0] === 1) {}',
			undefined,
			['nonZeroGreater'],
			'if (array.length > 0 && array[0] === 1) {}'
		),
		testCase(
			'if (array.length > 0) {}',
			'not-equal',
			['nonZeroEqual'],
			'if (array.length !== 0) {}'
		),
		testCase(
			'if (array.length >= 1) {}',
			'not-equal',
			['nonZeroEqual'],
			'if (array.length !== 0) {}'
		),
		testCase(
			'if (array.length != 0) {}',
			'greater-than',
			['nonZeroGreater'],
			'if (array.length > 0) {}'
		),
		testCase(
			'if (array.length !== 0) {}',
			'greater-than',
			['nonZeroGreater'],
			'if (array.length > 0) {}'
		),
		testCase(
			'if (array.length >= 1) {}',
			'greater-than',
			['nonZeroGreater'],
			'if (array.length > 0) {}'
		),
		testCase(
			'if (array.length != 0) {}',
			'greater-than-or-equal',
			['nonZeroGreaterEqual'],
			'if (array.length >= 1) {}'
		),
		testCase(
			'if (array.length !== 0) {}',
			'greater-than-or-equal',
			['nonZeroGreaterEqual'],
			'if (array.length >= 1) {}'
		),
		testCase(
			'if (array.length > 0) {}',
			'greater-than-or-equal',
			['nonZeroGreaterEqual'],
			'if (array.length >= 1) {}'
		),
		testCase(
			'if (array.length < 1 || array.length >= 1) {}',
			'not-equal',
			['zeroEqual', 'nonZeroEqual'],
			'if (array.length === 0 || array.length !== 0) {}'
		),
		testCase(
			'const foo = [].length ? null : undefined',
			undefined,
			['compareToValue']
		)
	]
});

test.visualize([
	'if ([].length) {}',
	'if (array.length < 1) {}',
	{
		code: 'if (array.length > 0) {}',
		options: [{'non-zero': 'not-equal'}]
	},
	{
		code: 'if (array.length != 0) {}',
		options: [{'non-zero': 'greater-than'}]
	},
	{
		code: 'if (array.length != 0) {}',
		options: [{'non-zero': 'greater-than-or-equal'}]
	}
]);
