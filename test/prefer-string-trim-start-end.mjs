import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
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
		'foo.trimLeft.bar()',
	],
	invalid: [
		'foo.trimLeft()',
		'foo.trimRight()',
		'trimLeft.trimRight()',
		'foo.trimLeft.trimRight()',
		'"foo".trimLeft()',
		outdent`
			foo
				// comment
				.trimRight/* comment */(
					/* comment */
				)
		`,
		'foo.trimLeft()',
	],
});
