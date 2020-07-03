import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/import-style';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	}
});

const defaultError = {
	messageId: 'importStyleDefault',
	data: {module: 'default'},
};

const namespaceError = {
	messageId: 'importStyleNamespace',
	data: {module: 'namespace'},
};

const namedError = {
	messageId: 'importStyleNamed',
	data: {module: 'named'},
};

ruleTester.run('import-style', rule, {
	valid: [
		`const x = require('default')`,
		`const {default: x} = require('default')`,
		`import x from 'default'`,

		`const x = require('namespace')`,
		`import * as x from 'namespace'`,

		`const {x} = require('named')`,
		`import {x} from 'named'`,
	],
	invalid: [
		{
			code: `import * as x from 'default'`,
			errors: [defaultError]
		},
		{
			code: `const {x} = require('default')`,
			errors: [defaultError]
		},
		{
			code: `const {x: y} = require('default')`,
			errors: [defaultError]
		},
		{
			code: `import {x} = require('default')`,
			errors: [defaultError]
		},
		{
			code: `import {x as y} from 'default'`,
			errors: [defaultError]
		},

		{
			code: `const {default: x} = require('namespace')`,
			errors: [namespaceError]
		},
		{
			code: `import x from 'namespace'`,
			errors: [namespaceError]
		},
		{
			code: `const {x} = require('namespace')`,
			errors: [namespaceError]
		},
		{
			code: `import {x} from 'namespace'`,
			errors: [namespaceError]
		},

		{
			code: `const x = require('named')`,
			errors: [namedError]
		},
		{
			code: `const {default: x} = require('named')`,
			errors: [namedError]
		},
		{
			code: `import x from 'named'`,
			errors: [namedError]
		},
		{
			code: `import * as x from 'named'`,
			errors: [namedError]
		},
	]
});
