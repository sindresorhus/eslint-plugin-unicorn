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

const MESSAGE_ID_BITWISE_OR = 'bitwiseOr';
const MESSAGE_ID_BITWISE_NOT = 'bitwiseNot';

const errorsBitwiseOr = [{messageId: MESSAGE_ID_BITWISE_OR}];
const errorsBitwiseNot = [{messageId: MESSAGE_ID_BITWISE_NOT}];

ruleTester.run('prefer-math-trunc', rule, {
	valid: [
		'const foo = 1 | 1;',
		'const foo = 0 | 1;',
		'const foo = ~3.9;',
		outdent`
			let foo = 0;
			foo |= 1;
		`,
		outdent`
			let foo = 1.2; // comment 1
			foo |= 1; // comment 2 and 1.2 | 0
		`
	],
	invalid: [
		// Basic "bitwise OR with 0" case
		{
			code: 'const foo = 1.1 | 0;',
			errors: errorsBitwiseOr,
			output: 'const foo = Math.trunc(1.1);'
		},
		{
			code: 'const foo = 111 | 0;',
			errors: errorsBitwiseOr,
			output: 'const foo = Math.trunc(111);'
		},
		{
			code: 'const foo = (1 + 2 / 3.4) | 0;',
			errors: errorsBitwiseOr,
			output: 'const foo = Math.trunc(1 + 2 / 3.4);'
		},
		{
			code: 'const foo = bar((1.4 | 0) + 2);',
			errors: errorsBitwiseOr,
			output: 'const foo = bar((Math.trunc(1.4)) + 2);'
		},
		{
			code: 'const foo = (0, 1.4) | 0;',
			errors: errorsBitwiseOr,
			output: 'const foo = Math.trunc((0, 1.4));'
		},
		// Multiple bitwise OR
		{
			code: 'const foo = 1.23 | 0 | 4;',
			errors: errorsBitwiseOr,
			output: 'const foo = Math.trunc(1.23) | 4;'
		},
		// Basic "bitwise NOT" case
		{
			code: 'const foo = ~~3.9;',
			errors: errorsBitwiseNot,
			output: 'const foo = Math.trunc(3.9);'
		},
		{
			code: 'const foo = ~~111;',
			errors: errorsBitwiseNot,
			output: 'const foo = Math.trunc(111);'
		},
		{
			code: 'const foo = ~~(1 + 2 / 3.4);',
			errors: errorsBitwiseNot,
			output: 'const foo = Math.trunc(1 + 2 / 3.4);'
		},
		{
			code: 'const foo = ~~1 + 2 / 3.4;',
			errors: errorsBitwiseNot,
			output: 'const foo = Math.trunc(1) + 2 / 3.4;'
		},
		{
			code: 'const foo = ~~(0, 1.4);',
			errors: errorsBitwiseNot,
			output: 'const foo = Math.trunc((0, 1.4));'
		},
		// Case with objects (MemberExpression and ChainExpression)
		{
			code: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = a.b.c | 0;
			`,
			errors: errorsBitwiseOr,
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
			errors: errorsBitwiseOr,
			output: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = Math.trunc(a.b?.c);
			`
		},
		{
			code: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = ~~a.b?.c;
			`,
			errors: errorsBitwiseNot,
			output: outdent`
				const foo = {a: {b: {c: 3}}};
				const bar = Math.trunc(a.b?.c);
			`
		},
		// With a variable
		{
			code: outdent`
				const foo = 3;
				const bar = foo | 0;
			`,
			errors: errorsBitwiseOr,
			output: outdent`
				const foo = 3;
				const bar = Math.trunc(foo);
			`
		},
		{
			code: outdent`
				const foo = 3;
				const bar = ~~foo;
			`,
			errors: errorsBitwiseNot,
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
			errors: errorsBitwiseOr,
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
			errors: errorsBitwiseOr,
			output: outdent`
				const foo = {a: {b: 3.4}};
				foo.a.b = Math.trunc(foo.a.b);
			`
		},
		// With comments
		{
			code: 'const foo = /* first comment */ 3.4 | 0; // A B C',
			errors: errorsBitwiseOr,
			output: 'const foo = /* first comment */ Math.trunc(3.4); // A B C'
		},
		{
			code: 'const foo = /* first comment */ ~~3.4; // A B C',
			errors: errorsBitwiseNot,
			output: 'const foo = /* first comment */ Math.trunc(3.4); // A B C'
		},
		{
			code: outdent`
				const foo = {a: {b: 3.4}};
				foo /* Comment 1 */ .a /* Comment 2 */ . /* Comment 3 */ b |= /* Comment 4 */ 0 /* Comment 5 */;
			`,
			errors: errorsBitwiseOr,
			output: outdent`
				const foo = {a: {b: 3.4}};
				foo /* Comment 1 */ .a /* Comment 2 */ . /* Comment 3 */ b = Math.trunc(foo /* Comment 1 */ .a /* Comment 2 */ . /* Comment 3 */ b) /* Comment 5 */;
			`
		},
		{
			code: outdent`
				const foo = {a: {b: 3.4}};
				const bar = /* Comment 1 */ ~~ a /* Comment 3 */ . /* Comment 4 */ b /* Comment 5 */;
			`,
			errors: errorsBitwiseNot,
			output: outdent`
				const foo = {a: {b: 3.4}};
				const bar = /* Comment 1 */ Math.trunc(a /* Comment 3 */ . /* Comment 4 */ b) /* Comment 5 */;
			`
		},
		{
			code: 'const foo = /* will keep */ 3.4 /* will remove 1 */ | /* will remove 2 */ 0;',
			errors: errorsBitwiseOr,
			output: 'const foo = /* will keep */ Math.trunc(3.4);'
		},
		{
			code: 'const foo = /* will keep */ ~ /* will remove 1 */ ~ /* will remove 2 */ 3.4;',
			errors: errorsBitwiseNot,
			output: 'const foo = /* will keep */ Math.trunc(3.4);'
		},
		{
			code: outdent`
				const foo = 3.4; // comment 1
				foo |= 0; // comment 2
			`,
			errors: errorsBitwiseOr,
			output: outdent`
				const foo = 3.4; // comment 1
				foo = Math.trunc(foo); // comment 2
			`
		},
		{
			code: outdent`
				const foo = 3.4; // comment 1
				const bar = ~~foo; // comment 2
			`,
			errors: errorsBitwiseNot,
			output: outdent`
				const foo = 3.4; // comment 1
				const bar = Math.trunc(foo); // comment 2
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
	'const foo = 10.01 | 0;',
	'const foo = ~~10.01;',
	outdent`
		let foo = 10.01;
		foo |= 0;
	`,
	outdent`
		const foo = 10.01;
		const bar = ~~foo;
	`,
	'const foo = ~~~10.01;',
	'const foo = ~~(~10.01);',
	'const foo = ~(~~10.01);',
	'const foo = ~~-10.01;',
	'const foo = ~~~~10.01;',
	'const foo = ~~10.01 | 0;',
	'const foo = ~~(10.01 | 0);',
	'const foo = 10.01 | 0 | 0;'
]);
