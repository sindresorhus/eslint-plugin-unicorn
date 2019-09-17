import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/import-style';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2019,
		sourceType: 'module'
	},
	env: {
		es6: true
	}
});

function buildError({moduleName, type}) {
	const error = {
		ruleId: 'import-style'
	};

	if (type === 'defaultImport') {
		error.message = `Do not make default import for ${moduleName}`;
		return error;
	}

	error.message = `Do not make named import for ${moduleName}`;
	return error;
}

ruleTester.run('import-style', rule, {
	valid: [
		{
			code: 'const {promisify} = require(\'util\');',
			options: [
				{
					defaultExport: {
						path: false
					},
					namedExport: {
						util: false
					}
				}
			]
		},
		'import {promisify} from \'util\';',
		'const file = require(\'unrestricted\');',
		'import file from \'unrestricted\';',
		'import {promisify as foo} from \'util\';',
		'import {debuglog, promisify} from \'util\';',
		'const {promisify : foo} = require(\'util\');'
	],
	invalid: [
		{
			code: 'const util = require(\'util\');',
			errors: [buildError({moduleName: 'util', type: 'defaultImport'})]
		},
		{
			code: 'import util from \'util\';',
			errors: [buildError({moduleName: 'util', type: 'defaultImport'})]
		},
		{
			code: 'import * as util from \'util\';',
			errors: [buildError({moduleName: 'util', type: 'defaultImport'})]
		},
		{
			code: 'import {something} from \'path\';',
			errors: [buildError({moduleName: 'path', type: 'namedImport'})]
		},
		{
			code: 'import util, {promisify} from \'util\';',
			errors: [buildError({moduleName: 'util', type: 'defaultImport'})]
		},
		{
			code: 'const foo = myFunction(\'util\')',
			errors: [buildError({moduleName: 'util', type: 'defaultImport'})]
		},
		{
			code: 'import {something} from \'restricted\';',
			options: [
				{
					defaultExport: {
						restricted: true
					}
				}
			],
			errors: [buildError({moduleName: 'restricted', type: 'namedImport'})]
		}
	]
});
