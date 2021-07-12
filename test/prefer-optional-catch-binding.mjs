import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const generateError = name => ({messageId: 'with-name', data: {name}});

test({
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
	],
	invalid: [
		{
			code: 'try {} catch (_) {}',
			output: 'try {} catch {}',
			errors: [generateError('_')],
		},
		{
			code: outdent`
				try {} catch (foo) {
					function bar(foo) {}
				}
			`,
			output: outdent`
				try {} catch {
					function bar(foo) {}
				}
			`,
			errors: [generateError('foo')],
		},
		// Many
		{
			code: outdent`
				try {} catch (outer) {
					try {} catch (inner) {
					}
				}
				try {
					try {} catch (inTry) {
					}
				} catch (another) {
					try {} catch (inCatch) {
					}
				} finally {
					try {} catch (inFinally) {
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
				generateError('inFinally'),
			],
		},
		// Actual message
		{
			code: 'try {} catch (theRealErrorName) {}',
			output: 'try {} catch {}',
			errors: [{message: 'Remove unused catch binding `theRealErrorName`.'}],
		},
		// TODO: this `error` should be able to remove
		// {
		// 	code: outdent`
		// 		try {
		// 		} catch (foo) {
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
			errors: [generateError('unused')],
		},
		// Spaces
		{
			code: 'try    {    } catch    (e)  \n  \t  {    }',
			//                               ^^^^^^^^^^ spaces after param will be removed.
			output: 'try    {    } catch    {    }',
			errors: 1,
		},
		{
			code: 'try {} catch(e) {}',
			output: 'try {} catch{}',
			errors: 1,
		},
		{
			code: 'try {} catch (e){}',
			output: 'try {} catch {}',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'try {} catch ({message}) {alert(message)}',
		'try {} catch ({cause: {message}}) {alert(message)}',
		// Not sure about this case
		'try {} catch({nonExistsProperty = thisWillExecute()}) {}',
	],
	invalid: [
		'try {} catch ({}) {}',
		'try {} catch ({message}) {}',
		'try {} catch ({message: notUsedMessage}) {}',
		'try {} catch ({cause: {message}}) {}',
	],
});
