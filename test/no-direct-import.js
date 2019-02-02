import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-direct-import';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		sourceType: 'module'
	}
});

const error = {
	ruleId: 'no-direct-import',
	message: 'Do not reference directly'
};

ruleTester.run('no-direct-import', rule, {
	valid: [
		'const {promisify} = require(\'util\');',
		'import {promisify} from \'util\';',
		'const file = require(\'unrestricted\')',
		'import file from \'unrestricted\'',
		'const util = myFunction(\'util\')'
	],
	invalid: [
		{
			code: 'const util = require(\'util\');',
			errors: [error]
		},
		{
			code: 'import util from \'util\';',
			errors: [error]
		},
		{
			code: 'import * as util from \'util\';',
			errors: [error]
		}
	]
});
