import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const errors = [{messageId: 'prefer-boolean-return'}];
const invalidCase = (code, output, extra = {}) => ({
	code,
	...(output !== undefined && {output}),
	errors,
	...extra,
});
const typescript = {languageOptions: {parser: parsers.typescript}};

test({
	valid: [],
	invalid: [
		invalidCase('function unicorn() { if (value /* keep */ > 0) { return true; } else { return false; } }', 'function unicorn() { return value /* keep */ > 0; }'),
		invalidCase('function unicorn() { if (value /* keep */ > 0) { return false; } return true; }', 'function unicorn() { return !(value /* keep */ > 0); }'),
		invalidCase('function unicorn() { if (test(/* keep */ value)) { return true; } return false; }', 'function unicorn() { return Boolean(test(/* keep */ value)); }'),
	],
});

test({
	valid: [],
	invalid: [
		invalidCase('function unicorn() { if (((/* keep */ value))) { return true; } return false; }', 'function unicorn() { return Boolean(((/* keep */ value))); }'),
		invalidCase('function unicorn() { if (((value /* keep */))) { return false; } else { return true; } }', 'function unicorn() { return !((value /* keep */)); }'),
		invalidCase('function unicorn() { if (value // keep\r\n > 0) { return true; } return false; }', 'function unicorn() { return value // keep\r\n > 0; }'),
		invalidCase('function unicorn() { if (value as /* keep */ boolean) { return true; } return false; }', 'function unicorn() { return Boolean(value as /* keep */ boolean); }', typescript),
		invalidCase('function run() { if (value satisfies /* keep */ boolean) { return false; } return true; }', 'function run() { return !(value satisfies /* keep */ boolean); }', typescript),
		...[
			'function unicorn() { if (value > 0 /* keep */) { return true; } return false; }',
			'function unicorn() { if (value /* copied */ > 0) { return /* keep */ true; } return false; }',
			'function unicorn() { if (value /* copied */ > 0) { return true; } /* keep */ return false; }',
			'function unicorn() { if (value /* copied */ > 0) { return true; } return false; // keep\n}',
			'function unicorn(Boolean) { if (test(/* keep */ value)) { return true; } return false; }',
		].map(code => invalidCase(code)),
	],
});

nodeTest('comment-preserving boolean returns evaluate their condition once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-boolean-return': rule}}},
		rules: {'unicorn/prefer-boolean-return': 'error'},
	};
	for (const [code, getExpected] of [
		['function unicorn(read) { if (read(/* keep */)) { return true; } return false; }', Boolean],
		['function unicorn(read) { if (read(/* keep */)) { return false; } return true; }', value => !value],
		['function unicorn(read) { if (read(/* keep */) > 0) { return true; } else { return false; } }', value => value > 0],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		for (const value of [0, 1, '', 'value', undefined, false, []]) {
			for (const source of [code, output]) {
				let calls = 0;
				const result = runInNewContext(`${source}\nunicorn(read);`, {
					read() {
						calls++;
						return value;
					},
				});
				t.assert.strictEqual(result, getExpected(value));
				t.assert.strictEqual(calls, 1);
			}
		}
	}
});

test({
	valid: [
		'function unicorn() { if (test) { return true; } doSomething(); return false; }',
		'function unicorn() { if (test) { return a; } return b; }',
		'function unicorn() { if (test) { return true; doSomething(); } return false; }',
		'function unicorn() { if (test) { return; } return false; }',
		'function unicorn() { if (a ? b : c) { return true; } return false; }',
		'function unicorn() { if (test) { return true; } else { return true; } }',
		'function unicorn() { if (a) { return false; } if (b) { return false; } return true; }',
		'function unicorn() { if (a) { return false; } if (b) { return false; } if (c) { return false; } return true; }',
		'function unicorn() { if (a) { return true; } if (b) { return true; } return false; }',
		'function unicorn() { if (a) return false; if (b) return false; return true; }',
	],
	invalid: [
		invalidCase('function unicorn() { if(test){ return true; } else{ return false; } }', 'function unicorn() { return Boolean(test); }'),
		invalidCase('function unicorn() { if (test) return true; else return false; }', 'function unicorn() { return Boolean(test); }'),
		invalidCase('function unicorn() { if(value > 0){ return true; } else{ return false; } }', 'function unicorn() { return value > 0; }'),
		invalidCase('function unicorn() { if(items.length){ return false; } else{ return true; } }', 'function unicorn() { return !items.length; }'),
		invalidCase('function unicorn(Boolean) { if(test){ return true; } else{ return false; } }'),
		invalidCase('function unicorn() { if(test){ return true; } else{ return false; /* comment */ } }'),
		invalidCase('function unicorn() { if(test){ return true; /* comment */ } else{ return false; } }'),
		invalidCase('function unicorn() { if (test) { return true; } return false; }', 'function unicorn() { return Boolean(test); }'),
		invalidCase('function unicorn() { if (test) { return false; } return true; }', 'function unicorn() { return !test; }'),
		invalidCase('function unicorn() { if (value > 0) { return true; } return false; }', 'function unicorn() { return value > 0; }'),
		invalidCase('function unicorn() { if (Boolean(value)) { return true; } return false; }', 'function unicorn() { return Boolean(value); }'),
		invalidCase('function unicorn() { if (a === b && c === d) { return true; } return false; }', 'function unicorn() { return a === b && c === d; }'),
		invalidCase('function unicorn() { if (a && b) { return true; } return false; }', 'function unicorn() { return Boolean(a && b); }'),
		invalidCase('function unicorn() { if (Array.isArray(value)) { return true; } return false; }', 'function unicorn() { return Array.isArray(value); }'),
		invalidCase('function unicorn(Array) { if (Array.isArray(value)) { return true; } return false; }', 'function unicorn(Array) { return Boolean(Array.isArray(value)); }'),
		invalidCase('function unicorn() { if (value > 0) { return false; } return true; }', 'function unicorn() { return !(value > 0); }'),
		invalidCase('function unicorn() { if (test) return true; return false; }', 'function unicorn() { return Boolean(test); }'),
		invalidCase('function unicorn() { if (items.length) { return true; } return false; }', 'function unicorn() { return Boolean(items.length); }'),
		invalidCase('function unicorn() { if (items.length) { return false; } return true; }', 'function unicorn() { return !items.length; }'),
		invalidCase('function unicorn() { if (object?.property) { return true; } return false; }', 'function unicorn() { return Boolean(object?.property); }'),
		invalidCase('function unicorn() { if (a, b) { return true; } return false; }', 'function unicorn() { return Boolean((a, b)); }'),
		invalidCase('function unicorn() { if ((a, b)) { return true; } return false; }', 'function unicorn() { return Boolean((a, b)); }'),
		invalidCase('function unicorn() { if ((test)) { return true; } return false; }', 'function unicorn() { return Boolean(test); }'),
		invalidCase('function unicorn() { if (value as boolean) { return true; } return false; }', 'function unicorn() { return Boolean(value as boolean); }', typescript),
		invalidCase('function unicorn(value: boolean) { if (value) { return true; } return false; }', 'function unicorn(value: boolean) { return Boolean(value); }', typescript),
		invalidCase('function unicorn() { if (value satisfies boolean) { return true; } return false; }', 'function unicorn() { return Boolean(value satisfies boolean); }', typescript),
		invalidCase('function unicorn() { if (value!) { return true; } return false; }', 'function unicorn() { return Boolean(value!); }', typescript),
		invalidCase('function unicorn() { if (<boolean>value) { return true; } return false; }', 'function unicorn() { return Boolean(<boolean>value); }', typescript),
		invalidCase('function unicorn() { if (value satisfies boolean) { return false; } return true; }', 'function unicorn() { return !(value satisfies boolean); }', typescript),
		{
			code: outdent`
				function unicorn() {
					if (test) {
						return true;
					}

					// comment
					return false;
				}
			`,
			errors,
		},
		{
			code: 'function unicorn() { if (test) { return true; } return false; // comment\n}',
			errors,
		},
		invalidCase('function unicorn() { if (/* comment */ test) { return true; } return false; }'),
		invalidCase('function unicorn(Boolean) { if (test) { return true; } return false; }'),
		invalidCase('function unicorn(Boolean) { if (test) { return false; } return true; }', 'function unicorn(Boolean) { return !test; }'),
		invalidCase('function unicorn(Boolean) { if (value > 0) { return true; } return false; }', 'function unicorn(Boolean) { return value > 0; }'),
		invalidCase('function unicorn() { if (a) { return false; } if (b) { return true; } return false; }', 'function unicorn() { if (a) { return false; } return Boolean(b); }'),
		{
			code: outdent`
				function unicorn() {
					if (test({
						multiline: true,
					})) {
						return true;
					}

					return false;
				}
			`,
			output: outdent`
				function unicorn() {
					return Boolean(test({
						multiline: true,
					}));
				}
			`,
			errors,
		},
		invalidCase('function unicorn() { if (!test) { return true; } return false; }', 'function unicorn() { return !test; }'),
		invalidCase('function unicorn() { if (delete object.key) { return true; } return false; }', 'function unicorn() { return delete object.key; }'),
		invalidCase('function unicorn() { if (typeof value) { return true; } return false; }', 'function unicorn() { return Boolean(typeof value); }'),
		invalidCase('function unicorn() { if (a === b || false) { return true; } return false; }', 'function unicorn() { return a === b || false; }'),
		invalidCase('function unicorn() { if ((value > 0)) { return false; } return true; }', 'function unicorn() { return !(value > 0); }'),
		// A type cannot shadow the global `Boolean`
		invalidCase('type Boolean = string; function unicorn() { if (test) { return true; } return false; }', 'type Boolean = string; function unicorn() { return Boolean(test); }', typescript),
	],
});

// `as`, `satisfies` and `!` have no runtime effect
test({
	valid: [
		// Only a boolean literal counts, an identifier needs type information
		{...typescript, code: 'function f() {\n\tif (a) {\n\t\treturn t!;\n\t}\n\n\treturn false;\n}'},
	],
	invalid: [
		...[
			['function f() {\n\tif (a) {\n\t\treturn true as const;\n\t}\n\n\treturn false;\n}', 'function f() {\n\treturn Boolean(a);\n}'],
			['function f() {\n\tif (a) {\n\t\treturn true as boolean;\n\t}\n\n\treturn false;\n}', 'function f() {\n\treturn Boolean(a);\n}'],
			['function f() {\n\tif (a) {\n\t\treturn true satisfies boolean;\n\t}\n\n\treturn false;\n}', 'function f() {\n\treturn Boolean(a);\n}'],
			['function f() {\n\tif (a) {\n\t\treturn false as const;\n\t}\n\n\treturn true;\n}', 'function f() {\n\treturn !a;\n}'],
			['function f() {\n\tif (a) {\n\t\treturn false!;\n\t}\n\n\treturn true;\n}', 'function f() {\n\treturn !a;\n}'],
		].map(([code, output]) => ({
			...typescript,
			code,
			output,
			errors: 1,
		})),
	],
});
