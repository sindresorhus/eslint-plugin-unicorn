import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const options = {
	checkExportFrom: true,
	styles: {
		unassigned: {
			unassigned: true,
			named: false,
		},
		default: {
			default: true,
			named: false,
		},
		namespace: {
			namespace: true,
			named: false,
		},
		named: {
			named: true,
		},
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
		moduleName: 'default',
	},
};

const namespaceError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'namespace',
		moduleName: 'namespace',
	},
};

const namedError = {
	messageId: 'importStyle',
	data: {
		allowedStyles: 'named',
		moduleName: 'named',
	},
};

const addDefaultOptions = test => {
	if (typeof test === 'string') {
		test = {
			code: test,
		};
	}

	return {
		options: [options],
		...test,
	};
};

test({
	valid: [
		'require(\'unassigned\')',
		'const {} = require(\'unassigned\')',
		'import \'unassigned\'',
		'import {} from \'unassigned\'',
		'import(\'unassigned\')',
		'export {} from \'unassigned\'',

		'const x = require(\'default\')',
		'const {default: x} = require(\'default\')',
		'const [] = require("default")',
		'import x from \'default\'',
		outdent`
			async () => {
				const {default: x} = await import('default');
			}
		`,
		'export {default} from \'default\'',

		'const x = require(\'namespace\')',
		'const [] = require("namespace")',
		'import * as x from \'namespace\'',
		outdent`
			async () => {
				const x = await import('namespace');
			}
		`,
		'export * from \'namespace\'',

		'const {x} = require(\'named\')',
		'const {...rest} = require("named")',
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

		// `export` without `from` should not crash
		'const foo = 1; export {foo}',
		'export const foo = 1;',
		'export function foo() {}',

		{
			code: 'import {inspect} from \'util\'',
			options: [],
		},
		{
			code: 'import {inspect} from \'node:util\'',
			options: [],
		},
		{
			code: 'const {inspect} = require(\'util\')',
			options: [],
		},
		{
			code: 'const {inspect} = require(\'node:util\')',
			options: [],
		},
		{
			code: 'import chalk from \'chalk\'',
			options: [],
		},
		{
			code: 'import {default as chalk} from \'chalk\'',
			options: [],
		},
		{
			code: 'export {promisify, callbackify} from \'util\'',
			options: [],
		},
		{
			code: 'export {promisify, callbackify} from \'node:util\'',
			options: [],
		},

		{
			code: 'require(\'chalk\')',
			options: [{
				styles: {},
				extendDefaultStyles: false,
			}],
		},
		{
			code: 'import \'chalk\'',
			options: [{
				checkImport: false,
			}],
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [{
				checkDynamicImport: false,
			}],
		},
		{
			code: 'import(\'chalk\')',
			options: [{
				checkDynamicImport: false,
			}],
		},
		{
			code: 'require(\'chalk\')',
			options: [{
				checkRequire: false,
			}],
		},
		{
			code: 'const {red} = require(\'chalk\')',
			options: [{
				checkRequire: false,
			}],
		},

		{
			code: 'import util, {inspect} from \'named-or-default\'',
			options: [{
				styles: {
					'named-or-default': {
						named: true,
						default: true,
					},
				},
			}],
		},

		'require(1, 2, 3)',
		'require(variable)',
		'const x = require(variable)',
		'const x = require(\'unassigned\').x',
		outdent`
			async () => {
				const {red} = await import(variable);
			}
		`,
		// `node:util` only allow `named`, set to `false` should allow any style
		{
			code: `
				import util from "node:util";
				import * as util2 from "node:util";
				import {foo} from "node:util";
			`,
			options: [
				{
					styles: {
						'node:util': false,
					},
				},
			],
		},
	].map(test => addDefaultOptions(test)),

	invalid: [
		{
			code: 'const {x} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'const {default: x} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import x from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {default: x} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const x = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import * as x from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const {x: y} = require(\'unassigned\')',
			errors: [unassignedError],
		},
		{
			code: 'import {x} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'import {x as y} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('unassigned');
				}
			`,
			errors: [unassignedError],
		},
		{
			code: 'const {...rest} = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'const [] = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'export * from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {x} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {x as y} from \'unassigned\'',
			errors: [unassignedError],
		},
		{
			code: 'export {default} from \'unassigned\'',
			errors: [unassignedError],
		},

		{
			code: 'require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {...rest} = require("default")',
			errors: [defaultError],
		},
		{
			code: 'import \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import {} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'import * as x from \'default\'',
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: 'const {x} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'const {x: y} = require(\'default\')',
			errors: [defaultError],
		},
		{
			code: 'import {x} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'import {x as y} from \'default\'',
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('default');
				}
			`,
			errors: [defaultError],
		},
		{
			code: 'export * from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'export {x} from \'default\'',
			errors: [defaultError],
		},
		{
			code: 'export {x as y} from \'default\'',
			errors: [defaultError],
		},

		{
			code: 'require(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'const {} = require(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'import \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'import {} from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'import(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'const {default: x} = require(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'const {...rest} = require("namespace")',
			errors: [namespaceError],
		},
		{
			code: 'import x from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'const {x} = require(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'const {x: y} = require(\'namespace\')',
			errors: [namespaceError],
		},
		{
			code: 'import {x} from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'import {x as y} from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: outdent`
				async () => {
					const {x} = await import('namespace');
				}
			`,
			errors: [namespaceError],
		},
		{
			code: outdent`
				async () => {
					const {x: y} = await import('namespace');
				}
			`,
			errors: [namespaceError],
		},
		{
			code: 'export {x} from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'export {x as y} from \'namespace\'',
			errors: [namespaceError],
		},
		{
			code: 'export {default} from \'namespace\'',
			errors: [namespaceError],
		},

		{
			code: 'require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const {} = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const [] = require("named")',
			errors: [namedError],
		},
		{
			code: 'import \'named\'',
			errors: [namedError],
		},
		{
			code: 'import {} from \'named\'',
			errors: [namedError],
		},
		{
			code: 'import(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const x = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'const {default: x} = require(\'named\')',
			errors: [namedError],
		},
		{
			code: 'import x from \'named\'',
			errors: [namedError],
		},
		{
			code: outdent`
				async () => {
					const {default: x} = await import('named');
				}
			`,
			errors: [namedError],
		},
		{
			code: 'import * as x from \'named\'',
			errors: [namedError],
		},
		{
			code: outdent`
				async () => {
					const x = await import('named');
				}
			`,
			errors: [namedError],
		},
		{
			code: 'export * from \'named\'',
			errors: [namedError],
		},
		{
			code: 'export {default} from \'named\'',
			errors: [namedError],
		},

		{
			code: 'import util, {inspect} from \'named\'',
			errors: [namedError],
		},
		{
			code: 'import util, {inspect} from \'default\'',
			errors: [defaultError],
		},

		{
			code: 'import util from \'util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import util from \'node:util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import * as util from \'util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import * as util from \'node:util\'',
			options: [],
			errors: 1,
		},
		{
			code: 'const util = require(\'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'const util = require(\'node:util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'node:util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'ut\' + \'il\')',
			options: [],
			errors: 1,
		},
		{
			code: 'require(\'node:\' + \'util\')',
			options: [],
			errors: 1,
		},
		{
			code: 'import {red} from \'chalk\'',
			options: [],
			errors: 1,
		},
		{
			code: 'import {red as green} from \'chalk\'',
			options: [],
			errors: 1,
		},
		{
			code: outdent`
				async () => {
					const {red} = await import('chalk');
				}
			`,
			options: [],
			errors: 1,
		},

		{
			code: 'require(\'no-unassigned\')',
			options: [{
				styles: {
					'no-unassigned': {
						named: true,
						namespace: true,
						default: true,
					},
				},
			}],
			errors: [{
				messageId: 'importStyle',
				data: {
					allowedStyles: 'named, namespace, or default',
					moduleName: 'no-unassigned',
				},
			}],
		},
		// `node:util` only allow `named`, add `default` should keep `named` allowed ... (see next test)
		{
			code: `
				import * as util from "node:util";
			`,
			options: [
				{
					styles: {
						'node:util': {
							default: true,
						},
					},
				},
			],
			errors: [{
				messageId: 'importStyle',
				data: {
					allowedStyles: 'named or default',
					moduleName: 'node:util',
				},
			}],
		},
		// ...(see previous test), unless we disable `named` explicitly
		{
			code: `
				import * as util from "node:util";
			`,
			options: [
				{
					styles: {
						'node:util': {
							default: true,
							named: false,
						},
					},
				},
			],
			errors: [{
				messageId: 'importStyle',
				data: {
					allowedStyles: 'default',
					moduleName: 'node:util',
				},
			}],
		},
	].map(test => addDefaultOptions(test)),
});

test.babel({
	valid: [
		'const {...rest2} = require("named")',
	],
	invalid: [
		{
			code: 'const {...rest2} = require("unassigned")',
			errors: [unassignedError],
		},
		{
			code: 'const {...rest2} = require("default")',
			errors: [defaultError],
		},
		{
			code: 'const {...rest2} = require("namespace")',
			errors: [namespaceError],
		},
	].map(test => addDefaultOptions(test)),
});

test.typescript({
	valid: [
		{
			code: 'import {type ChalkInstance} from \'chalk\'',
			options: [],
		},
		{
			code: 'import type {ChalkInstance} from \'chalk\'',
			options: [],
		},
	],
	invalid: [],
});

test.snapshot({
	valid: [
		'let a',
	],
	invalid: [
		'import util from \'util\'',
		'import util from \'node:util\'',
		'import * as util from \'util\'',
		'import * as util from \'node:util\'',
		'const util = require(\'util\')',
		'const util = require(\'node:util\')',
		'require(\'util\')',
		'require(\'node:util\')',
		'import {red} from \'chalk\'',
		'import {red as green} from \'chalk\'',
		outdent`
			async () => {
				const {red} = await import('chalk');
			}
		`,
	],
});
