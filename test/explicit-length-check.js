import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/explicit-length-check';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = message => {
	return {
		ruleId: 'explicit-length-check',
		message
	};
};

const errorMessages = {
	compareToValue: error('`length` property should be compared to a value.'),
	zeroEqual: error('Zero `.length` should be compared with `=== 0`.'),
	nonZeroEqual: error('Non-zero `.length` should be compared with `!== 0`.'),
	nonZeroGreater: error('Non-zero `.length` should be compared with `> 0`.'),
	nonZeroGreaterEqual: error('Non-zero `.length` should be compared with `>= 1`.')
};

function testCase(code, nonZeroType, errors, output) {
	return {
		code,
		output: output || code,
		errors: errors || [],
		options: nonZeroType && [{
			'non-zero': nonZeroType
		}]
	};
}

ruleTester.run('explicit-length-check', rule, {
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
		testCase('if (array.length !== 0) {}'),
		testCase('if (array.length !== 0 && array[0] === 1) {}'),
		testCase('if (array.length === 1) {}'),
		testCase('if (array.length <= 1) {}'),
		testCase('if (array.length > 1) {}'),
		testCase('if (array.length < 2) {}'),
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
		testCase('if ("".length === 0 && array.length !== 0) {}', 'not-equal')
	],
	invalid: [
		testCase('if ([].length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if ("".length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (!array.length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.foo.length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (!!array.length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.length && array[0] === 1) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array[0] === 1 || array.length) {}',
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.length < 1) {}',
			undefined,
			[errorMessages.zeroEqual],
			'if (array.length === 0) {}'
		),
		testCase('if (array.length<1) {}',
			undefined,
			[errorMessages.zeroEqual],
			'if (array.length === 0) {}'
		),
		testCase('if (array.length > 0) {}',
			'not-equal',
			[errorMessages.nonZeroEqual],
			'if (array.length !== 0) {}'
		),
		testCase('if (array.length >= 1) {}',
			'not-equal',
			[errorMessages.nonZeroEqual],
			'if (array.length !== 0) {}'
		),
		testCase('if (array.length != 0) {}',
			'greater-than',
			[errorMessages.nonZeroGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length !== 0) {}',
			'greater-than',
			[errorMessages.nonZeroGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length >= 1) {}',
			'greater-than',
			[errorMessages.nonZeroGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length != 0) {}',
			'greater-than-or-equal',
			[errorMessages.nonZeroGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length !== 0) {}',
			'greater-than-or-equal',
			[errorMessages.nonZeroGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length > 0) {}',
			'greater-than-or-equal',
			[errorMessages.nonZeroGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length < 1 || array.length >= 1) {}',
			'not-equal',
			[errorMessages.zeroEqual, errorMessages.nonZeroEqual],
			'if (array.length === 0 || array.length !== 0) {}'
		)
	]
});
