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
			var a = require('a');
			var b = require('b');
		`,
		outdent`
			var a = require('ab');
			var b = require('ab');
		`,
		outdent`
			var a = require('a');
			import b from 'b';
		`,
		outdent`
			import a from 'a';
			var b = require('b');
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
			var z = require('a');
			var y = require('b');
		`,
		outdent`
			var c = require('c');

			function foo() {
				var b = require('b');
				var a = require('a');
			}
		`,
		outdent`
			import fs from 'fs';
			import a from 'a';
		`,
		{
			code: outdent`
				var a = require('a');

				var b = require('b');
			`,
			options: [{
				allowBlankLines: true
			}]
		},
		outdent`
			var a = require('a');
			// Not a blank line
			var b = require('b');
		`,
		outdent`
			var a = require('a');
			/*

			Not a blank line

			*/
			var b = require('b');
		`
	],
	invalid: [
		{
			code: outdent`
				var b = require('b');
				var a = require('a');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				import b from 'b';
				var a = require('a');
			`,
			errors: [errorOrder]
		},
		{
			code: outdent`
				var b = require('b');
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
				var b = require('b');

				var a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				var b = require('b');
				const foo = 'foo';

				var a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				var b = require('b');

				const foo = 'foo';
				var a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		},
		{
			code: outdent`
				var b = require('b');
				{ const foo = 'foo'; }
				var a = require('a');
			`,
			errors: [
				errorOrder,
				errorBlankLines
			]
		}
	]
});
