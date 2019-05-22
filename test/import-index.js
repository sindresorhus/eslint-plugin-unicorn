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
	message: 'Do not reference the index file directly.'
};

ruleTester.run('import-index', rule, {
	valid: [
		'const m = require(\'.\')',
		'const m = require(\'..\')',
		'const m = require(\'../..\')',
		'const m = require(\'./foobar\')',
		'const m = require(\'foobar\')',
		'const m = require(\'index\')',
		'const m = require(\'index.js\')',
		'const m = require(\'indexbar\')',
		'const m = require(\'fooindex\')',
		'const m = require(\'@index/foo\')',
		'const m = require(\'@foo/index\')',
		'const m = require(\'@foo/index.js\')',
		'import m from \'.\'',
		'import m from \'..\'',
		'import m from \'../..\'',
		'import m from \'./foobar\'',
		'import m from \'foobar\'',
		'import m from \'index\'',
		'import m from \'index.js\'',
		'import m from \'indexbar\'',
		'import m from \'fooindex\'',
		'import m from \'@index/foo\'',
		'import m from \'@foo/index\'',
		'import m from \'@foo/index.js\''
	],
	invalid: [
		{
			code: 'const m = require(\'./\')',
			errors: [error],
			output: 'const m = require(\'.\')'
		},
		{
			code: 'const m = require(\'./index\')',
			errors: [error],
			output: 'const m = require(\'.\')'
		},
		{
			code: 'const m = require(\'./index.js\')',
			errors: [error],
			output: 'const m = require(\'.\')'
		},
		{
			code: 'const m = require(\'../../index.js\')',
			errors: [error],
			output: 'const m = require(\'../..\')'
		},
		{
			code: 'const m = require(\'./foo/index.js\')',
			errors: [error],
			output: 'const m = require(\'./foo\')'
		},
		{
			code: 'const m = require(\'./foobar/\')',
			errors: [error],
			output: 'const m = require(\'./foobar\')'
		},
		{
			code: 'const m = require(\'@foo/index/index\')',
			errors: [error],
			output: 'const m = require(\'@foo/index\')'
		},
		{
			code: 'const m = require(\'@foo/index/index.js\')',
			errors: [error],
			output: 'const m = require(\'@foo/index\')'
		},
		{
			code: 'import m from \'./\'',
			errors: [error],
			output: 'import m from \'.\''
		},
		{
			code: 'import m from \'./index\'',
			errors: [error],
			output: 'import m from \'.\''
		},
		{
			code: 'import m from \'./index.js\'',
			errors: [error],
			output: 'import m from \'.\''
		},
		{
			code: 'import m from \'../../index\'',
			errors: [error],
			output: 'import m from \'../..\''
		},
		{
			code: 'import m from \'./foo/index.js\'',
			errors: [error],
			output: 'import m from \'./foo\''
		},
		{
			code: 'import m from \'./foobar/\'',
			errors: [error],
			output: 'import m from \'./foobar\''
		},
		{
			code: 'import m from \'@foo/index/index\'',
			errors: [error],
			output: 'import m from \'@foo/index\''
		},
		{
			code: 'import m from \'@foo/index/index.js\'',
			errors: [error],
			output: 'import m from \'@foo/index\''
		}
	]
});
