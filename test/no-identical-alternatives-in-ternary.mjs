import {outdent} from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a ? b ? c : 1 : 2',
		'a && b ? c : 1',
	],
	invalid: [
		'a ? b ? c : 1 : 1',
		'a ? b ? c : "str" : "str"',
		'a ? b ? c : sameReference : sameReference',
		'a ? b ? c : { foo: 1 } : { foo: 1 }',
		outdent`
			const foo = { bar: 1 };
			a ? b ? c : foo.bar : foo.bar
		`,
		// With comments
		'/** comment before a */ a /** comment after a */ ? b ? c : 1 : 1',
		outdent`
			/** comment before a */
			a ?
			/** comment after a */ b ? c : 1 : 1
		`,
		outdent`
			/** comment before a */
			a ?
			/** comment after a */ b /** comment after b */ ? c /** comment after c */ : 1 : 1 /** comment after value */
		`,
		'/** comment includes ? */ a /** comment includes ? */ ? b ? c : 1 : 1',

		// Don't use outdent for the following cases, outdent will causes eslint parsing errors
		`
		   a ?
			 b ?
			 c :
			 1 :
			 1
		`,
		`
		   a ? // comment a
			 b ? // comment b
			 c : // comment c
			 1 : // comment 1
			 1   // comment repeat 1
		`,
		`
		   /** comment before a */ a ? // comment a
			 /** comment before b */ b ? // comment b
			 /** comment before c */ c : // comment c
			 /** comment before 1 */ 1 : // comment 1
			 /** comment before repeat 1 */ 1   // comment repeat 1
		`,

		// Edge cases
		'(a ? b ? c : 1 : 1)',
		'a ? b ? c : (1, 2) : (1, 2)',
		'a ? (b ? c : 1) : 1',
		'(a ? (b ? c : 1) : 1)',
		'a ? b ? c : a === 100 : a === 100',
		outdent`
			async function foo() {
				return a ? b ? c : await 1 : await 1;
			}
		`,
		outdent`
			function* foo() {
				return a ? b ? c : yield 1 : yield 1;
			}
		`,
	],
});
