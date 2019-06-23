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

const errorImport = {
	ruleId: 'import-path-order',
	messageId: 'import-path-order'
};

const errorRequire = {
	ruleId: 'import-path-order',
	messageId: 'require-path-order'
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
		`
	],
	invalid: [
		{
			code: outdent`
				var b = require('b');
				var a = require('a');
			`,
			errors: [errorRequire]
		},
		{
			code: outdent`
				import b from 'b';
				var a = require('a');
			`,
			errors: [errorRequire]
		},
		{
			code: outdent`
				var b = require('b');
				import a from 'a';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import b from 'b';
				import a from 'a';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import b from './b';
				import a from 'a';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import b from '../b';
				import a from 'a';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import b from '../../b';
				import a from 'a';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import a from './a';
				import b from '../b';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import a from '../a';
				import b from '../../b';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import a from '../../a';
				import b from '../../../b';
			`,
			errors: [errorImport]
		},
		{
			code: outdent`
				import b from 'b';
				import fs from 'fs';
			`,
			errors: [errorImport]
		}
	]
});
