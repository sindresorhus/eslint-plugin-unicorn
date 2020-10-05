import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-math-trunc';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

const error = {
	messageId: 'prefer-math-trunc'
};

ruleTester.run('prefer-math-trunc', rule, {
	valid: [
		'const foo = 1 | 1;',
		'const foo = 0 | 1;',
		outdent`
			let foo = 0;
			foo |= 1;
		`
	],
	invalid: [
		// Basic "bitwise OR with 0" case
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
		// Multiple bitwise OR
		{
			code: 'const foo = 1.23 | 0 | 4;',
			errors: [error],
			output: 'const foo = Math.trunc(1.23) | 4;'
		},
		// Case with objects (MemberExpression and ChainExpression)
		{
			code: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = a.b.c | 0;
			`,
			errors: [error],
			output: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = Math.trunc(a.b.c);
			`
		},
		{
			code: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = a.b?.c | 0;
			`,
			errors: [error],
			output: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = Math.trunc(a.b?.c);
			`
		},
		// With a variable on the left side
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
		// With an AssignementExpression
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
		},
		{
			code: outdent`
				const foo = {a: {b: 3.4}};
				foo.a.b |= 0;
			`,
			errors: [error],
			output: outdent`
				const foo = {a: {b: 3.4}};
				foo.a.b = Math.trunc(foo.a.b);
			`
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('prefer-math-trunc', rule, [
	'const foo = 10.01 | 0;'
]);
