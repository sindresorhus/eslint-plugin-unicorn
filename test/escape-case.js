import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/escape-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'escape-case',
	message: 'Use uppercase characters for the value of the escape sequence'
}];

ruleTester.run('escape-case', rule, {
	valid: [
		'const foo = \'\\xA9\';',
		'const foo = \'\\uD834\';',
		'const foo = \'\\u{1D306}\';',
		'const foo = \'\\cA\'',
		'const foo = `\\xA9`;',
		'const foo = `\\uD834`;',
		'const foo = `\\u{1D306}`;',
		'const foo = `\\cA`;'
	],
	invalid: [
		{
			code: 'const foo = \'\\xa9\';',
			errors
		},
		{
			code: 'const foo = \'\\ud834\';',
			errors
		},
		{
			code: 'const foo = \'\\u{1d306}\';',
			errors
		},
		{
			code: 'const foo = \'\\ca\';',
			errors
		},
		{
			code: 'const foo = `\\xa9`;',
			errors
		},
		{
			code: 'const foo = `\\ud834`;',
			errors
		},
		{
			code: 'const foo = `\\u{1d306}`;',
			errors
		},
		{
			code: 'const foo = `\\ca`;',
			errors
		}
	]
});
