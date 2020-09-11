import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import visualizeRuleTester from './utils/visualize-rule-tester';
import rule from '../rules/prefer-trim-start-end';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errorTrimLeft = {
	messageId: 'trimLeft'
};

const errorTrimRight = {
	messageId: 'trimRight'
};

ruleTester.run('prefer-trim-start-end', rule, {
	valid: [
		'foo.trimStart()',
		'foo.trimEnd()',
		// Not `CallExpression`
		'new foo.trimLeft();',
		// Not `MemberExpression`
		'trimLeft();',
		// `callee.property` is not a `Identifier`
		'foo[\'trimLeft\']();',
		// Computed
		'foo[trimLeft]();',
		// Not `trimLeft`/`trimRight`
		'foo.bar();',
		// More argument(s)
		'foo.trimLeft(extra);',
		'foo.trimLeft(...argumentsArray)',
		// `trimLeft` is in argument
		'foo.bar(trimLeft)',
		'foo.bar(foo.trimLeft)',
		// `trimLeft` is in `MemberExpression.object`
		'trimLeft.foo()',
		'foo.trimLeft.bar()'
	],
	invalid: [
		{
			code: 'foo.trimLeft()',
			output: 'foo.trimStart()',
			errors: [errorTrimLeft]
		},
		{
			code: 'foo.trimRight()',
			output: 'foo.trimEnd()',
			errors: [errorTrimRight]
		},
		{
			code: 'trimLeft.trimRight()',
			output: 'trimLeft.trimEnd()',
			errors: [errorTrimRight]
		},
		{
			code: 'foo.trimLeft.trimRight()',
			output: 'foo.trimLeft.trimEnd()',
			errors: [errorTrimRight]
		},
		{
			code: '"foo".trimLeft()',
			output: '"foo".trimStart()',
			errors: [errorTrimLeft]
		},
		{
			code: outdent`
				foo
					// comment
					.trimRight/* comment */(
						/* comment */
					)
			`,
			output: outdent`
				foo
					// comment
					.trimEnd/* comment */(
						/* comment */
					)
			`,
			errors: [errorTrimRight]
		}
	]
});

const visualizeTester = visualizeRuleTester(test);
visualizeTester.run('prefer-trim-start-end', rule, [
	'foo.trimLeft()',
	outdent`
		foo
			// comment
			.trimRight/* comment */(
				/* comment */
			)
	`
]);
