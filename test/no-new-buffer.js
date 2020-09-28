import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-new-buffer';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const allocError = {
	messageId: 'no-new-buffer',
	data: {method: 'alloc'}
};

const fromError = {
	messageId: 'no-new-buffer',
	data: {method: 'from'}
};

ruleTester.run('no-new-buffer', rule, {
	valid: [
		'const buf = Buffer.from(\'buf\')',
		'const buf = Buffer.from(\'7468697320697320612074c3a97374\', \'hex\')',
		'const buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
		'const buf = Buffer.alloc(10)'
	],
	invalid: [
		{
			code: 'const buf = new Buffer()',
			errors: [fromError],
			output: 'const buf = Buffer.from()'
		},
		{
			code: 'const buf = new Buffer(\'buf\')',
			errors: [fromError],
			output: 'const buf = Buffer.from(\'buf\')'
		},
		{
			code: 'const buf = new Buffer(\'7468697320697320612074c3a97374\', \'hex\')',
			errors: [fromError],
			output: 'const buf = Buffer.from(\'7468697320697320612074c3a97374\', \'hex\')'
		},
		{
			code: 'const buf = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])',
			errors: [fromError],
			output: 'const buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])'
		},
		{
			code: 'const buf = new Buffer(10)',
			errors: [allocError],
			output: 'const buf = Buffer.alloc(10)'
		},
		{
			code: outdent`
				const ab = new ArrayBuffer(10);
				const buf = new Buffer(ab, 0, 2);
			`,
			errors: [fromError],
			output: outdent`
				const ab = new ArrayBuffer(10);
				const buf = Buffer.from(ab, 0, 2);
			`
		},
		{
			code: outdent`
				const buf1 = new Buffer('buf');
				const buf2 = new Buffer(buf1);
			`,
			errors: [fromError, fromError],
			output: outdent`
				const buf1 = Buffer.from('buf');
				const buf2 = Buffer.from(buf1);
			`
		}
	]
});

typescriptRuleTester.run('no-new-buffer', rule, {
	valid: [],
	invalid: [
		{
			code: 'new Buffer(input, encoding);',
			errors: [fromError],
			output: 'Buffer.from(input, encoding);'
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});
visualizeTester.run('no-new-buffer', rule, [
	'const buf = new Buffer()',
	'const buf = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])'
]);
