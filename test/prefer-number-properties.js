import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-number-properties';

const messageId = 'preferNumberProperties';
const methods = {
	parseInt: {
		safe: true,
		code: 'parseInt("10", 2);'
	},
	parseFloat: {
		safe: true,
		code: 'parseFloat("10.5");'
	},
	isNaN: {
		safe: false,
		code: 'isNaN(10);'
	},
	isFinite: {
		safe: false,
		code: 'isFinite(10);'
	}
};

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		ecmaVersion: 2020
	}
});

const invalidTest = ({code, output, name}) => {
	const isSafe = methods[name].safe;

	const error = {
		messageId,
		data: {
			name
		}
	};

	return {
		code,
		output: isSafe ? output : code,
		errors: isSafe ? [{...error, suggestions: undefined}] : [{suggestions: [error]}]
	};
};

// Methods
ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'Number.parseInt("10", 2);',
		'Number.parseFloat("10.5");',
		'Number.isNaN(10);',
		'Number.isFinite(10);',

		// Not call
		...Object.keys(methods),

		// New
		...Object.values(methods).map(({code}) => `new ${code}`),

		// Shadowed
		...Object.entries(methods).map(([name, {code}]) => outdent`
			const ${name} = function() {};
			${code}
		`),
		...Object.entries(methods).map(([name, {code}]) => outdent`
			const {${name}} = Number;
			${code}
		`),
		...Object.entries(methods).map(([name, {code}]) => outdent`
			const ${name} = function() {};
			function inner() {
				return ${code}
			}
		`)
	],

	invalid: [
		invalidTest({
			code: 'parseInt("10", 2);',
			output: 'Number.parseInt("10", 2);',
			name: 'parseInt'
		}),
		invalidTest({
			code: 'parseFloat("10.5");',
			output: 'Number.parseFloat("10.5");',
			name: 'parseFloat'
		}),
		invalidTest({
			code: 'isNaN(10);',
			name: 'isNaN'
		}),
		invalidTest({
			code: 'isFinite(10);',
			name: 'isFinite'
		}),
		{
			code: outdent`
				const a = parseInt("10", 2);
				const b = parseFloat("10.5");
				const c = isNaN(10);
				const d = isFinite(10);
			`,
			output: outdent`
				const a = Number.parseInt("10", 2);
				const b = Number.parseFloat("10.5");
				const c = isNaN(10);
				const d = isFinite(10);
			`,
			errors: [
				{
					messageId,
					data: {
						name: 'parseInt'
					}
				},
				{
					messageId,
					data: {
						name: 'parseFloat'
					}
				},
				{
					suggestions: [
						{
							messageId,
							data: {
								name: 'isNaN'
							}
						}
					]
				},
				{
					suggestions: [
						{
							messageId,
							data: {
								name: 'isFinite'
							}
						}
					]
				}
			]
		}
	]
});

// NaN
const errorNaN = [
	{
		messageId,
		data: {
			name: 'NaN'
		}
	}
];
ruleTester.run('prefer-node-remove', rule, {
	valid: [
		'const foo = Number.NaN;',
		'const foo = bar.NaN;',
		// Shadowed
		outdent`
			function foo () {
				const NaN = 2
				return NaN
			}
		`
	],
	invalid: [
		{
			code: 'const foo = NaN;',
			output: 'const foo = Number.NaN;',
			errors: errorNaN
		},
		{
			code: 'if (Number.isNaN(NaN)) {}',
			output: 'if (Number.isNaN(Number.NaN)) {}',
			errors: errorNaN
		},
		{
			code: 'if (Object.is(foo, NaN)) {}',
			output: 'if (Object.is(foo, Number.NaN)) {}',
			errors: errorNaN
		}
	]
});
