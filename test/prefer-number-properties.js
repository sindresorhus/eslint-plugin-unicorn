import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-number-properties';

const ruleId = 'prefer-number-properties';
const methodMessageId = 'method';
const propertyMessageId = 'property';

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
	parserOptions: {
		ecmaVersion: 2020
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const invalidMethodTest = ({code, output, name}) => {
	const isSafe = methods[name].safe;

	const error = {
		messageId: methodMessageId,
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
ruleTester.run(ruleId, rule, {
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
		invalidMethodTest({
			code: 'parseInt("10", 2);',
			output: 'Number.parseInt("10", 2);',
			name: 'parseInt'
		}),
		invalidMethodTest({
			code: 'parseFloat("10.5");',
			output: 'Number.parseFloat("10.5");',
			name: 'parseFloat'
		}),
		invalidMethodTest({
			code: 'isNaN(10);',
			name: 'isNaN'
		}),
		invalidMethodTest({
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
					messageId: methodMessageId,
					data: {
						name: 'parseInt'
					}
				},
				{
					messageId: methodMessageId,
					data: {
						name: 'parseFloat'
					}
				},
				{
					suggestions: [
						{
							messageId: methodMessageId,
							data: {
								name: 'isNaN'
							}
						}
					]
				},
				{
					suggestions: [
						{
							messageId: methodMessageId,
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
		messageId: propertyMessageId,
		data: {
			name: 'NaN'
		}
	}
];
ruleTester.run(ruleId, rule, {
	valid: [
		'const foo = Number.NaN;',
		'const foo = window.Number.NaN;',
		'const foo = bar.NaN;',
		// Shadowed
		outdent`
			function foo () {
				const NaN = 2
				return NaN
			}
		`,
		'const {NaN} = {};',
		'function NaN() {}',
		'class NaN {}',
		'class Foo { NaN(){}}'
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
		},
		{
			code: 'const foo = bar[NaN];',
			output: 'const foo = bar[Number.NaN];',
			errors: errorNaN
		},
		{
			code: 'const foo = {NaN};',
			output: 'const foo = {NaN: Number.NaN};',
			// TODO: should be one error
			errors: [...errorNaN, ...errorNaN]
		},
		{
			code: 'const foo = {NaN: NaN};',
			output: 'const foo = {NaN: Number.NaN};',
			errors: errorNaN
		},
		{
			code: 'const {foo = NaN} = {};',
			output: 'const {foo = Number.NaN} = {};',
			errors: errorNaN
		}
	]
});

typescriptRuleTester.run(ruleId, rule, {
	valid: [
		// https://github.com/angular/angular/blob/b4972fa1656101c02c92ddbf247db6e0de139937/packages/common/src/i18n/locale_data_api.ts#L178
		{
			code: outdent`
				export enum NumberSymbol {
					Decimal,
					NaN,
				}
			`
		},
		// https://github.com/microsoft/TypeScript/blob/114fe4deab68519a44969c1db8300003719059db/src/lib/es5.d.ts#L5
		{
			code: 'declare var NaN: number;'
		},
		// https://github.com/microsoft/TypeScript/blob/114fe4deab68519a44969c1db8300003719059db/src/lib/es5.d.ts#L566
		{
			code: outdent`
				interface NumberConstructor {
					readonly NaN: number;
				}
			`
		},
		'declare function NaN(s: string, radix?: number): number;'
	],
	invalid: []
});
