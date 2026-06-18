import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const errors = [{messageId: 'prefer-boolean-return'}];
const invalidCase = (code, output, extra = {}) => ({
	code,
	...(output !== undefined && {output}),
	errors,
	...extra,
});
const typescript = {languageOptions: {parser: parsers.typescript}};

test({
	valid: [
		'function unicorn() { if (test) { return true; } doSomething(); return false; }',
		'function unicorn() { if (test) { return a; } return b; }',
		'function unicorn() { if (test) { return true; doSomething(); } return false; }',
		'function unicorn() { if (test) { return; } return false; }',
		'function unicorn() { if (a ? b : c) { return true; } return false; }',
		'function unicorn() { if (test) { return true; } else { return true; } }',
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
	],
});
