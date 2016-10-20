import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-new-buffer';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const allocError = {
	ruleId: 'no-new-buffer',
	message: '`new Buffer()` is deprecated, use `Buffer.alloc()` instead.'
};

const fromError = {
	ruleId: 'no-new-buffer',
	message: '`new Buffer()` is deprecated, use `Buffer.from()` instead.'
};

ruleTester.run('no-new-buffer', rule, {
	valid: [
		`const buf = Buffer.from('buf')`,
		`const buf = Buffer.from('7468697320697320612074c3a97374', 'hex')`,
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
			code: `const buf = new Buffer('buf')`,
			errors: [fromError],
			output: `const buf = Buffer.from('buf')`
		},
		{
			code: `const buf = new Buffer('7468697320697320612074c3a97374', 'hex')`,
			errors: [fromError],
			output: `const buf = Buffer.from('7468697320697320612074c3a97374', 'hex')`
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
			code: `
				const ab = new ArrayBuffer(10);
				const buf = new Buffer(ab, 0, 2);
			`,
			errors: [fromError],
			output: `
				const ab = new ArrayBuffer(10);
				const buf = Buffer.from(ab, 0, 2);
			`
		},
		{
			code: `
				const buf1 = new Buffer('buf');
				const buf2 = new Buffer(buf1);
			`,
			errors: [fromError, fromError],
			output: `
				const buf1 = Buffer.from('buf');
				const buf2 = Buffer.from(buf1);
			`
		}
	]
});
