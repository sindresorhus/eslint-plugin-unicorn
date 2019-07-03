import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/import-path-order';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const errorGroup = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order-group'
};

const errorDepth = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order-depth'
};

const errorOrder = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order'
};

const errorBlankLines = {
	ruleId: 'import-path-order',
	messageId: 'import-path-blanklines'
};

ruleTester.run('import-path-order', rule, {
	valid: [
		outdent`
			const a = require('a');
			const b = require('b');
		`,
		outdent`
			const a = require('ab');
			const b = require('ab');
		`,
		outdent`
			const a = require('a');
			import b from 'b';
		`,
		outdent`
			import a from 'a';
			const b = require('b');
		`,
		outdent`
			import a from 'a';
			import b from 'b';
		`,
		outdent`
			import a from 'ab';
			import b from 'ab';
		`,
		outdent`
			import { a } from 'ab';
			import { b } from 'ab';
		`,
		outdent`
			const z = require('a');
			const y = require('b');
		`,
		outdent`
			const c = require('c');

			function foo() {
				const b = require('b');
				const a = require('a');
			}
		`,
		outdent`
			import fs from 'fs';
			import a from 'a';
		`,
		{
			code: outdent`
				const a = require('a');

				const b = require('b');
			`,
			options: [{
				allowBlankLines: true
			}]
		},
		outdent`
			const a = require('a');
			// Not a blank line
			const b = require('b');
		`,
		outdent`
			const a = require('a');
			/*

			Not a blank line

			*/
			const b = require('b');
		`,
		outdent`
			import 'a';
			import b from 'b';
			const c = require('c');
		`,
		outdent`
			import a from 'a';
			import 'b';
			const c = require('c');
		`,
		outdent`
			import a from 'a';
			require('b');
			const c = require('c');
		`
	],
	invalid: [
		{
			code: outdent`
				const b = require('b');
				const a = require('a');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				const a = require('a');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const b = require('b');
				import a from 'a';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				import a from 'a';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from './b';
				import a from 'a';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from '../b';
				import a from 'a';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from '../../b';
				import a from 'a';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import a from './a';
				import b from '../b';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import a from '../a';
				import b from '../../b';
			`,
			errors: [errorDepth]
		},
		{
			code: outdent`
				import a from '../../a';
				import b from '../../../b';
			`,
			errors: [errorDepth]
		},
		{
			code: outdent`
				import b from 'b';
				import fs from 'fs';
			`,
			errors: [errorGroup]
		},
		{
			code: outdent`
				import b from 'b';
				import 'a';
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				require('a');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				const b = require('b');

				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				const b = require('b');

				// Comment
				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				const b = require('b');
				// Comment

				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				const b = require('b');
				const foo = 'foo';

				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				const b = require('b');

				const foo = 'foo';
				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				const b = require('b');
				{ const foo = 'foo'; }
				const a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		}
	]
});
