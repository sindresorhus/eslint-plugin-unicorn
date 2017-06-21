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
	lengthFirst: error('`length` property should be first argument of comparision.'),
	compareToValue: error('`length` property should be compared to a value.'),
	emptyEqual: error('empty `length` should be compared with `=== 0`.'),
	emptyLess: error('empty `length` should be compared with `< 1`.'),
	notEmptyEqual: error('not empty `length` should be compared with `!== 1`.'),
	notEmptyGreater: error('not empty `length` should be compared with `> 0`.'),
	notEmptyGreaterEqual: error('not empty `length` should be compared with `>= 1`.')
};

function testCase(code, emptyType, notEmptyType, errors = []) {
	return {
		code,
		options: (emptyType || notEmptyType) && [{
			empty: emptyType,
			'not-empty': notEmptyType
		}],
		errors
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
		testCase('if (array.length !== 0) {}'),
		testCase('if (array.length !== 0 && array[0] === 1) {}'),
		testCase('if (array.length == 0) {}', 'eq'),
		testCase('if (array.length === 0) {}', 'eq'),
		testCase('if (array.length === 1) {}', 'eq'),
		testCase('if (array.length <= 1) {}', 'eq'),
		testCase('if (array.length > 1) {}', 'eq'),
		testCase('if (array.length < 2) {}', 'eq'),
		testCase('if ([].length < 1) {}', 'lt'),
		testCase('if ([].length === 1) {}', 'lt'),
		testCase('if (array.length === 0) {}', ['eq', 'lt']),
		testCase('if (array.length < 1) {}', ['eq', 'lt']),
		testCase('if (array.length <= 1) {}', ['eq', 'lt']),
		testCase('if ("".length !== 0) {}', undefined, 'ne'),
		testCase('if ([].length === 0) {}', undefined, 'ne'),
		testCase('if ([].length === 1) {}', undefined, 'ne'),
		testCase('if ([].length <= 1) {}', undefined, 'ne'),
		testCase('if ("".length == 0) {}', undefined, 'ne'),
		testCase('if ("".length > 0) {}', undefined, 'gt'),
		testCase('if ("".length >= 0) {}', undefined, 'gt'),
		testCase('if ("".length >= 2) {}', undefined, 'gt'),
		testCase('if ("".length >= 1) {}', undefined, 'gte'),
		testCase('if ("".length === 0) {}', undefined, 'gte'),
		testCase('if ("".length > 2) {}', undefined, 'gte'),
		testCase('if ("".length === 2) {}', undefined, 'gte'),
		testCase('if ("".length === 0 && array.length >= 1) {}', 'eq', 'gte'),
		testCase('if ("".length === 0 && array.length > 0) {}', 'eq', 'gt'),
		testCase('if ("".length === 0 && array.length !== 0) {}', 'eq', 'ne'),
		testCase('if ("".length < 1 && array.length >= 1) {}', 'lt', 'gte'),
		testCase('if ("".length < 1 && array.length > 0) {}', 'lt', 'gt'),
		testCase('if ("".length < 1 && array.length != 0) {}', 'lt', 'ne')
	],
	invalid: [
		testCase('if ([].length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if ("".length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (!array.length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.foo.length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (!!array.length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array.length && array[0] === 1) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (array[0] === 1 || array.length) {}',
			undefined,
			undefined,
			[errorMessages.compareToValue]
		),
		testCase('if (1 === array.length) {}',
			undefined,
			undefined,
			[errorMessages.lengthFirst]
		),
		testCase('if ([].length === 0 || 0 < array.length) {}',
			undefined,
			undefined,
			[errorMessages.lengthFirst]
		),
		testCase('if (array.length < 1) {}',
			'eq',
			undefined,
			[errorMessages.emptyEqual]
		),
		testCase('if (array.length === 0) {}',
			'lt',
			undefined,
			[errorMessages.emptyLess]
		),
		testCase('if (array.length == 0) {}',
			'lt',
			undefined,
			[errorMessages.emptyLess]
		),
		testCase('if (array.length > 0) {}',
			undefined,
			'ne',
			[errorMessages.notEmptyEqual]
		),
		testCase('if (array.length >= 1) {}',
			undefined,
			'ne',
			[errorMessages.notEmptyEqual]
		),
		testCase('if (array.length != 0) {}',
			undefined,
			'gt',
			[errorMessages.notEmptyGreater]
		),
		testCase('if (array.length !== 0) {}',
			undefined,
			'gt',
			[errorMessages.notEmptyGreater]
		),
		testCase('if (array.length >= 1) {}',
			undefined,
			'gt',
			[errorMessages.notEmptyGreater]
		),
		testCase('if (array.length != 0) {}',
			undefined,
			'gte',
			[errorMessages.notEmptyGreaterEqual]
		),
		testCase('if (array.length !== 0) {}',
			undefined,
			'gte',
			[errorMessages.notEmptyGreaterEqual]
		),
		testCase('if (array.length > 0) {}',
			undefined,
			'gte',
			[errorMessages.notEmptyGreaterEqual]
		),
		testCase('if (array.length < 1 || array.length >= 1) {}',
			'eq',
			'ne',
			[errorMessages.emptyEqual, errorMessages.notEmptyEqual]
		),
		testCase('if (array1.length === 0 && array2.length > 0) {}',
			'lt',
			'gte',
			[errorMessages.emptyLess, errorMessages.notEmptyGreaterEqual]
		),
		testCase('if (array1.length == 0 && array2.length != 0 && 1 > [].length) {}',
			'lt',
			'gt',
			[errorMessages.emptyLess, errorMessages.notEmptyGreater, errorMessages.lengthFirst]
		)
	]
});
