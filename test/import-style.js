import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/import-style';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	}
});

const options = {
	checkExportFrom: true,
	styles: {
		unassigned: {
			unassigned: true
		},
		default: {
			default: true
		},
		namespace: {
			namespace: true
		},
		named: {
			named: true
		}
	}
};

const unassignedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'unassigned',
		moduleName: 'unassigned'
	}
};

const defaultError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'default',
		moduleName: 'default'
	}
};

const namespaceError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'namespace',
		moduleName: 'namespace'
	}
};

const namedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'named',
		moduleName: 'named'
	}
};

const addDefaultOptions = test => {
	if (typeof test === 'string') {
		test = {
			code: test
		};
	}

	return {
		options: [options],
		...test
	};
};

ruleTester.run('import-style', rule, {
	valid: [
		'require(\'unassigned\')',
		'const {} = require(\'unassigned\')',
		'import \'unassigned\'',
		'import {} from \'unassigned\'',
		'import(\'unassigned\')',
		'export {} from \'unassigned\'',

		'const x = require(\'default\')',
		'const {default: x} = require(\'default\')',
		'import x from \'default\'',
		outdent`
			async () => {
				const {default: x} = await import('default');
			}
		`,
		'export {default} from \'default\'',

		'const x = require(\'namespace\')',
		'import * as x from \'namespace\'',
		outdent`
			async () => {
				const x = await import('namespace');
			}
		`,
		'export * from \'namespace\'',

		'const {x} = require(\'named\')',
		'const {x: y} = require(\'named\')',
		'import {x} from \'named\'',
		'import {x as y} from \'named\'',
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
		'export {x} from \'named\'',
		'export {x as y} from \'named\'',

		{
			code: 'import {inspect} from \'util\'',
			options: []
		},
		{
			code: 'const {inspect} = require(\'util\')',
			options: []
		},
		{
			code: 'import chalk from \'chalk\'',
			options: []
		},
		{
			code: 'import {default as chalk} from \'chalk\'',
			options: []
		},
		{
			code: 'const {inspect} = require(\'util\')',
			options: []
		},
		{
			code: 'export {promisify, callbackify} from \'util\'',
			options: []
		},

		{
			code: 'require(\'chalk\')',
			options: [{
				styles: {},
				extendDefaultStyles: false
			}]
		},
		{
			code: 'import \'chalk\'',
			options: [{
				checkImport: false
			}]
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [{
				checkDynamicImport: false
			}]
		},
		{
			code: 'import(\'chalk\')',
			options: [{
				checkDynamicImport: false
			}]
		},
		{
			code: 'require(\'chalk\')',
			options: [{
				checkRequire: false
			}]
		},
		{
			code: 'const {red} = require(\'chalk\')',
			options: [{
				checkRequire: false
			}]
		},

		{
			code: 'import util, {inspect} from \'named-or-default\'',
			options: [{
				styles: {
					'named-or-default': {
						named: true,
						default: true
					}
				}
			}]
		},

		'require(1, 2, 3)',
		'require(variable)',
		'const x = require(variable)',
		'const x = require(\'unassigned\').x',
		outdent`
			async () => {
				const {red} = await import(variable);
			}
		`
	].map(test => addDefaultOptions(test)),

	invalid: [
		{
			code: 'const {x} = require(\'unassigned\')',
			errors: [unassignedError]
		},
		{
			code: 'const {default: x} = require(\'unassigned\')',
			errors: [unassignedError]
		},
		{
			code: 'import x from \'unassigned\'',
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
			code: 'const x = require(\'unassigned\')',
			errors: [unassignedError]
		},
		{
			code: 'import * as x from \'unassigned\'',
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
			code: 'const {x} = require(\'unassigned\')',
			errors: [unassignedError]
		},
		{
			code: 'const {x: y} = require(\'unassigned\')',
			errors: [unassignedError]
		},
		{
			code: 'import {x} from \'unassigned\'',
			errors: [unassignedError]
		},
		{
			code: 'import {x as y} from \'unassigned\'',
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
			code: 'export * from \'unassigned\'',
			errors: [unassignedError]
		},
		{
			code: 'export {x} from \'unassigned\'',
			errors: [unassignedError]
		},
		{
			code: 'export {x as y} from \'unassigned\'',
			errors: [unassignedError]
		},
		{
			code: 'export {default} from \'unassigned\'',
			errors: [unassignedError]
		},

		{
			code: 'require(\'default\')',
			errors: [defaultError]
		},
		{
			code: 'const {} = require(\'default\')',
			errors: [defaultError]
		},
		{
			code: 'import \'default\'',
			errors: [defaultError]
		},
		{
			code: 'import {} from \'default\'',
			errors: [defaultError]
		},
		{
			code: 'import(\'default\')',
			errors: [defaultError]
		},
		{
			code: 'import * as x from \'default\'',
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
			code: 'const {x} = require(\'default\')',
			errors: [defaultError]
		},
		{
			code: 'const {x: y} = require(\'default\')',
			errors: [defaultError]
		},
		{
			code: 'import {x} from \'default\'',
			errors: [defaultError]
		},
		{
			code: 'import {x as y} from \'default\'',
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
			code: 'export * from \'default\'',
			errors: [defaultError]
		},
		{
			code: 'export {x} from \'default\'',
			errors: [defaultError]
		},
		{
			code: 'export {x as y} from \'default\'',
			errors: [defaultError]
		},

		{
			code: 'require(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'const {} = require(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'import \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'import {} from \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'import(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'const {default: x} = require(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'import x from \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'const {x} = require(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'const {x: y} = require(\'namespace\')',
			errors: [namespaceError]
		},
		{
			code: 'import {x} from \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'import {x as y} from \'namespace\'',
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
			code: 'export {x} from \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'export {x as y} from \'namespace\'',
			errors: [namespaceError]
		},
		{
			code: 'export {default} from \'namespace\'',
			errors: [namespaceError]
		},

		{
			code: 'require(\'named\')',
			errors: [namedError]
		},
		{
			code: 'const {} = require(\'named\')',
			errors: [namedError]
		},
		{
			code: 'import \'named\'',
			errors: [namedError]
		},
		{
			code: 'import {} from \'named\'',
			errors: [namedError]
		},
		{
			code: 'import(\'named\')',
			errors: [namedError]
		},
		{
			code: 'const x = require(\'named\')',
			errors: [namedError]
		},
		{
			code: 'const {default: x} = require(\'named\')',
			errors: [namedError]
		},
		{
			code: 'import x from \'named\'',
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
			code: 'import * as x from \'named\'',
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
		{
			code: 'export * from \'named\'',
			errors: [namedError]
		},
		{
			code: 'export {default} from \'named\'',
			errors: [namedError]
		},

		{
			code: 'import util, {inspect} from \'named\'',
			errors: [namedError]
		},
		{
			code: 'import util, {inspect} from \'default\'',
			errors: [defaultError]
		},

		{
			code: 'import util from \'util\'',
			options: [],
			errors: [{}]
		},
		{
			code: 'import * as util from \'util\'',
			options: [],
			errors: [{}]
		},
		{
			code: 'const util = require(\'util\')',
			options: [],
			errors: [{}]
		},
		{
			code: 'require(\'util\')',
			options: [],
			errors: [{}]
		},
		{
			code: 'require(\'ut\' + \'il\')',
			options: [],
			errors: [{}]
		},
		{
			code: 'import {red} from \'chalk\'',
			options: [],
			errors: [{}]
		},
		{
			code: 'import {red as green} from \'chalk\'',
			options: [],
			errors: [{}]
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [],
			errors: [{}]
		},

		{
			code: 'require(\'no-unassigned\')',
			options: [{
				styles: {
					'no-unassigned': {
						named: true,
						namespace: true,
						default: true
					}
				}
			}],
			errors: [{
				messageId: 'importStyle',
				data: {
					allowedStyles: 'named, namespace or default',
					moduleName: 'no-unassigned'
				}
			}]
		}
	].map(test => addDefaultOptions(test))
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	}
});

visualizeTester.run('consistent-function-scoping', rule, [
	'import util from \'util\'',
	'import * as util from \'util\'',
	'const util = require(\'util\')',
	'require(\'util\')',
	'import {red} from \'chalk\'',
	'import {red as green} from \'chalk\'',
	outdent`
		async () => {
			const {red} = await import('chalk');
		}
	`
]);
