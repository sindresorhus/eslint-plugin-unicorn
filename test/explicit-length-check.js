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
	emptyEqual: error('Empty `.length` should be compared with `=== 0`.'),
	notEmptyEqual: error('Non-zero `.length` should be compared with `!== 0`.'),
	notEmptyGreater: error('Non-zero `.length` should be compared with `> 0`.'),
	notEmptyGreaterEqual: error('Non-zero `.length` should be compared with `>= 1`.')
};

function testCase(code, notEmptyType, errors, output) {
	return {
		code,
		output: output || code,
		errors: errors || [],
		options: notEmptyType && [{
			'not-empty': notEmptyType
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
		testCase('array.length', 'ne'),
		testCase('array.length > 0', 'ne'),
		testCase('array.length >= 1', 'ne'),
		testCase('if ("".length !== 0) {}', 'ne'),
		testCase('if ([].length === 0) {}', 'ne'),
		testCase('if ([].length === 1) {}', 'ne'),
		testCase('if ([].length <= 1) {}', 'ne'),
		testCase('if ("".length == 0) {}', 'ne'),
		testCase('array.length !== 0', 'gt'),
		testCase('array.length >= 1', 'gt'),
		testCase('if ("".length > 0) {}', 'gt'),
		testCase('if ("".length >= 0) {}', 'gt'),
		testCase('if ("".length >= 2) {}', 'gt'),
		testCase('if ("".length >= 1) {}', 'gte'),
		testCase('array.length !== 0', 'gte'),
		testCase('array.length > 0', 'gte'),
		testCase('if ("".length === 0) {}', 'gte'),
		testCase('if ("".length > 2) {}', 'gte'),
		testCase('if ("".length === 2) {}', 'gte'),
		testCase('if ("".length === 0 && array.length >= 1) {}', 'gte'),
		testCase('if ("".length === 0 && array.length > 0) {}', 'gt'),
		testCase('if ("".length === 0 && array.length !== 0) {}', 'ne')
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
			'eq',
			[errorMessages.emptyEqual],
			'if (array.length === 0) {}'
		),
		testCase('if (array.length<1) {}',
			'eq',
			[errorMessages.emptyEqual],
			'if (array.length === 0) {}'
		),
		testCase('if (array.length > 0) {}',
			'ne',
			[errorMessages.notEmptyEqual],
			'if (array.length !== 0) {}'
		),
		testCase('if (array.length >= 1) {}',
			'ne',
			[errorMessages.notEmptyEqual],
			'if (array.length !== 0) {}'
		),
		testCase('if (array.length != 0) {}',
			'gt',
			[errorMessages.notEmptyGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length !== 0) {}',
			'gt',
			[errorMessages.notEmptyGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length >= 1) {}',
			'gt',
			[errorMessages.notEmptyGreater],
			'if (array.length > 0) {}'
		),
		testCase('if (array.length != 0) {}',
			'gte',
			[errorMessages.notEmptyGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length !== 0) {}',
			'gte',
			[errorMessages.notEmptyGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length > 0) {}',
			'gte',
			[errorMessages.notEmptyGreaterEqual],
			'if (array.length >= 1) {}'
		),
		testCase('if (array.length < 1 || array.length >= 1) {}',
			'ne',
			[errorMessages.emptyEqual, errorMessages.notEmptyEqual],
			'if (array.length === 0 || array.length !== 0) {}'
		)
	]
});
