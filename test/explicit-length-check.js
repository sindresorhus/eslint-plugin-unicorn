import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/explicit-length-check';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errorMessages = {
	lengthFirst: '`length` property should be first argument of comparision',
	compareToValue: '`length` property should be compared to a value.',
	emptyEqual: 'empty `length` should be compared with `=== 0`',
	emptyLess: 'empty `length` should be compared with `< 1`'
};

function testCase(code, emptyType, error) {
	return {
		code,
		options: [{empty: emptyType}],
		errors: [{
			ruleId: 'explicit-length-check',
			message: error
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
		testCase('if (array.length !== 0) {}'),
		testCase('if (array.length !== 0 && array[0] === 1) {}'),
		testCase('if (array.length == 0) {}', 'eq'),
		testCase('if (array.length === 0) {}', 'eq'),
		testCase('if (array.length === 1) {}', 'eq'),
		testCase('if (array.length <= 1) {}', 'eq'),
		testCase('if (array.length > 1) {}', 'eq'),
		testCase('if ([].length < 1) {}', 'lt')
	],
	invalid: [
		testCase('if ([].length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if ("".length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (array.length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (!array.length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (array.foo.length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (!!array.length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (array.length && array[0] === 1) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (array[0] === 1 || array.length) {}',
			undefined,
			errorMessages.compareToValue
		),
		testCase('if (1 === array.length) {}',
			undefined,
			errorMessages.lengthFirst
		),
		testCase('if ([].length === 0 || 0 < array.length) {}',
			undefined,
			errorMessages.lengthFirst
		),
		testCase('if (array.length < 1) {}',
			'eq',
			errorMessages.emptyEqual
		),
		testCase('if (array.length === 0) {}',
			'lt',
			errorMessages.emptyLess
		),
		testCase('if (array.length == 0) {}',
			'lt',
			errorMessages.emptyLess
		)
	]
});
