import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/import-index';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const error = {
	ruleId: 'import-index',
	message: 'Import index files with `.`'
};

ruleTester.run('import-index', rule, {
	valid: [
		`const m = require('.')`,
		`const m = require('../..')`,
		`import m from '.'`,
		`import m from '..'`
	],
	invalid: [
		{
			code: `const m = require('./')`,
			errors: [error],
			output: `const m = require('.')`
		},
		{
			code: `const m = require('./index')`,
			errors: [error],
			output: `const m = require('.')`
		},
		{
			code: `const m = require('./index.js')`,
			errors: [error],
			output: `const m = require('.')`
		},
		{
			code: `const m = require('../../index.js')`,
			errors: [error],
			output: `const m = require('../..')`
		},
		{
			code: `import m from './'`,
			errors: [error],
			output: `import m from '.'`
		},
		{
			code: `import m from './index'`,
			errors: [error],
			output: `import m from '.'`
		},
		{
			code: `import m from './index.js'`,
			errors: [error],
			output: `import m from '.'`
		},
		{
			code: `import m from '../../index'`,
			errors: [error],
			output: `import m from '../..'`
		}
	]
});
