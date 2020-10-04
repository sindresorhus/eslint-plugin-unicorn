import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-bitwise-trunc';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	messageId: 'no-bitwise-trunc'
};

ruleTester.run('no-bitwise-trunc', rule, {
	valid: [
		'const foo = 1 | 1;',
		'const foo = 0 | 1;',
		outdent`
			let foo = 0;
			foo |= 1;
		`
	],
	invalid: [
		{
			code: 'const foo = 1.1 | 0;',
			errors: [error],
			output: 'const foo = Math.trunc(1.1);'
		},
		{
			code: 'const foo = 111 | 0;',
			errors: [error],
			output: 'const foo = Math.trunc(111);'
		},
		{
			code: 'const foo = 1.23 | 0 | 4;',
			errors: [error],
			output: 'const foo = Math.trunc(1.23) | 4;'
		},
		{
			code: 'const foo = 1.23 | 0.0;',
			errors: [error],
			output: 'const foo = Math.trunc(1.23);'
		},
		{
			code: outdent`
				const foo = 3;
				const bar = foo | 0;
			`,
			errors: [error],
			output: outdent`
				const foo = 3;
				const bar = Math.trunc(foo);
			`
		},
		{
			code: outdent`
				let foo = 2;
				foo |= 0;
			`,
			errors: [error],
			output: outdent`
				let foo = 2;
				foo = Math.trunc(foo);
			`
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('no-bitwise-trunc', rule, [
	'const foo = 10.01 | 0;'
]);
