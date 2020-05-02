import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-optional-catch-binding';

const ERROR_MESSAGE_ID = 'error';
const generateError = name => ({messageId: ERROR_MESSAGE_ID, data: {name}});

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

ruleTester.run('prefer-optional-catch-binding', rule, {
	valid: [
		'try {} catch {}',
		outdent`
			try {} catch {
				error
			}
		`,
		outdent`
			try {} catch(used) {
				console.error(used);
			}
		`,
		outdent`
			try {} catch(usedInADeeperScope) {
				function foo() {
					function bar() {
						console.error(usedInADeeperScope);
					}
				}
			}
		`,
		// We are not checking destructuring
		'try {} catch({message}) {}',
		'try {} catch({nonExistsProperty = thisWillExecute()}) {}'
	],
	invalid: [
		{
			code: 'try {} catch(_) {}',
			output: 'try {} catch {}',
			errors: [generateError('_')]
		},
		{
			code: outdent`
				try {} catch(foo) {
					function bar(foo) {}
				}
			`,
			output: outdent`
				try {} catch {
					function bar(foo) {}
				}
			`,
			errors: [generateError('foo')]
		},
		// Many
		{
			code: outdent`
				try {} catch(outer) {
					try {} catch(inner) {
					}
				}
				try {
					try {} catch(inTry) {
					}
				} catch(another) {
					try {} catch(inCatch) {
					}
				} finally {
					try {} catch(inFinally) {
					}
				}
			`,
			output: outdent`
				try {} catch {
					try {} catch {
					}
				}
				try {
					try {} catch {
					}
				} catch {
					try {} catch {
					}
				} finally {
					try {} catch {
					}
				}
			`,
			errors: [
				generateError('outer'),
				generateError('inner'),
				generateError('inTry'),
				generateError('another'),
				generateError('inCatch'),
				generateError('inFinally')
			]
		},
		// Actual message
		{
			code: 'try {} catch(theRealErrorName) {}',
			output: 'try {} catch {}',
			errors: [{message: 'Remove unused catch binding `theRealErrorName`.'}]
		},
		// TODO: this `error` should be able to remove
		// {
		// 	code: outdent`
		// 		try {
		// 		} catch(foo) {
		// 			var foo = 1;
		// 		}
		// 	`,
		// 	output: outdent`
		// 		try {
		// 		} catch {
		// 			var foo = 1;
		// 		}
		// 	`,
		// 	errors: [generateError('foo')]
		// },
		// Comments
		{
			code: outdent`
				/* comment */
				try {
					/* comment */
					// comment
				} catch (
					/* comment */
					// comment
					unused
					/* comment */
					// comment
				) {
					/* comment */
					// comment
				}
				/* comment */
			`,
			output: outdent`
				/* comment */
				try {
					/* comment */
					// comment
				} catch{SPACE}
					/* comment */
					// comment
				{TAB}
					/* comment */
					// comment
				 {
					/* comment */
					// comment
				}
				/* comment */
			`.replace('{SPACE}', ' ').replace('{TAB}', '\t'),
			errors: [generateError('unused')]
		}
	]
});
