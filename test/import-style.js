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

const options = {
	styles: {
		unassigned: 'unassigned',
		default: 'default',
		namespace: 'namespace',
		named: 'named',
	},
};

const unassignedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'unassigned',
		moduleName: 'unassigned',
	},
};

const defaultError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'default',
		moduleName: 'default'
	},
};

const namespaceError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'namespace',
		moduleName: 'namespace'
	},
};

const namedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'named',
		moduleName: 'named'
	},
};

const addOptions = test => {
	if (typeof test === 'string') {
		test = {
			code: test,
		};
	}

	return {
		options: [ options ],
		...test
	};
}

ruleTester.run('import-style', rule, {
	valid: [
		`require('unassigned')`,
		`import 'unassigned'`,
		`import('unassigned')`,

		`const x = require('default')`,
		`const {default: x} = require('default')`,
		`import x from 'default'`,
		outdent`
			async () => {
				const {default: x} = await import('default');
			}
		`,

		`const x = require('namespace')`,
		`import * as x from 'namespace'`,
		outdent`
			async () => {
				const x = await import('namespace');
			}
		`,

		`const {x} = require('named')`,
		`const {x: y} = require('named')`,
		`import {x} from 'named'`,
		`import {x as y} from 'named'`,
		outdent`
			async () => {
				const {x} = await import('named');
			}
		`,
		outdent`
			async () => {
				const {x: y} = await import('named');
			}
		`,
	].map(addOptions),

	invalid: [
		{
			code: `const {x} = require('unassigned')`,
			errors: [unassignedError]
		},
		{
			code: `const {default: x} = require('unassigned')`,
			errors: [unassignedError]
		},
		{
			code: `import x from 'unassigned'`,
			errors: [unassignedError]
		},
		{
			code: outdent`
				async () => {
					const {default: x} = await import('unassigned');
				}
			`,
			errors: [unassignedError]
		},
		{
			code: `const x = require('unassigned')`,
			errors: [unassignedError]
		},
		{
			code: `import * as x from 'unassigned'`,
			errors: [unassignedError]
		},
		{
			code: outdent`
				async () => {
					const x = await import('unassigned');
				}
			`,
			errors: [unassignedError]
		},
		{
			code: `const {x} = require('unassigned')`,
			errors: [unassignedError]
		},
		{
			code: `const {x: y} = require('unassigned')`,
			errors: [unassignedError]
		},
		{
			code: `import {x} from 'unassigned'`,
			errors: [unassignedError]
		},
		{
			code: `import {x as y} from 'unassigned'`,
			errors: [unassignedError]
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('unassigned');
				}
			`,
			errors: [unassignedError]
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('unassigned');
				}
			`,
			errors: [unassignedError]
		},

		{
			code: `import * as x from 'default'`,
			errors: [defaultError]
		},
		{
			code: outdent`
				async () => {
					const x = await import('default');
				}
			`,
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
			code: `import {x} from 'default'`,
			errors: [defaultError]
		},
		{
			code: `import {x as y} from 'default'`,
			errors: [defaultError]
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('default');
				}
			`,
			errors: [defaultError]
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('default');
				}
			`,
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
			code: `const {x: y} = require('namespace')`,
			errors: [namespaceError]
		},
		{
			code: `import {x} from 'namespace'`,
			errors: [namespaceError]
		},
		{
			code: `import {x as y} from 'namespace'`,
			errors: [namespaceError]
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('namespace');
				}
			`,
			errors: [namespaceError]
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('namespace');
				}
			`,
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
			code: outdent`
				async () => {
					const {default: x} = await import('named');
				}
			`,
			errors: [namedError]
		},
		{
			code: `import * as x from 'named'`,
			errors: [namedError]
		},
		{
			code: outdent`
				async () => {
					const x = await import('named');
				}
			`,
			errors: [namedError]
		},
	].map(addOptions)
});
