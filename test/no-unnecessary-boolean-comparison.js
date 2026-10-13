import {stripTypeScriptTypes} from 'node:module';
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

nodeTest('boolean comparison fixes under delete preserve the property reference boundary', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: {rules: {'no-unnecessary-boolean-comparison': rule}}},
		rules: {'unicorn/no-unnecessary-boolean-comparison': 'error'},
	};

	for (const operator of ['===', '!==']) {
		for (const literal of [true, false]) {
			for (const value of [true, false]) {
				const expression = `delete ((object.value as boolean) ${operator} ${literal})`;
				const code = `"use strict"; const object = {value: ${value}}; const result = ${expression}; JSON.stringify({result, exists: Object.hasOwn(object, "value"), value: object.value});`;
				const {output, fixed, messages} = linter.verifyAndFix(code, config);
				const shouldNegate = operator === '===' ? !literal : literal;
				t.assert.strictEqual(fixed, shouldNegate);
				if (shouldNegate) {
					t.assert.deepStrictEqual(messages, []);
				} else {
					t.assert.strictEqual(output, code);
					t.assert.strictEqual(messages.length, 1);
					t.assert.strictEqual(messages[0].fix, undefined);
				}

				const result = runInNewContext(stripTypeScriptTypes(output));
				t.assert.deepStrictEqual(JSON.parse(result), {result: true, exists: true, value});
			}
		}
	}
});

test({
	valid: [],
	invalid: [
		...[
			'delete ((object.value as boolean) === true);',
			'delete ((object.value as boolean) !== false);',
			'delete (((object.value as boolean) === true) as boolean);',
			'delete ((object.value as boolean) === true)!;',
			'delete (((object.value as boolean) === true) satisfies boolean);',
			'delete (<boolean>((object.value as boolean) === true));',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}, errors: [{messageId: 'no-unnecessary-boolean-comparison'}]})),
		{
			code: 'const result = +((object.value as boolean) === true);',
			output: 'const result = +((object.value as boolean));',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'no-unnecessary-boolean-comparison'}],
		},
	],
});

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

test.snapshot({
	valid: [
		// Unknown value. `value === true` is not equivalent to `value` or `Boolean(value)`.
		'value === true',
		'value !== true',
		'value === false',
		'value !== false',
		'true === value',
		'false !== value',

		// Loose equality is out of scope.
		'flag == true',
		'flag != false',

		// Boolean-like names are not proof.
		'isEnabled === true',
		'hasValue !== false',

		// Optional chaining can produce `undefined`.
		'array?.includes(value) === true',

		// No boolean literal comparison.
		'a === b',
		'(a > b) === (c > d)',
		'flag === Boolean(value)',
		'true === false',

		// A `yield` expression evaluates to the value sent back into the generator, not the yielded argument.
		'function * foo() {\n\tconst result = (yield a > b) === true;\n}',
		'function * foo() {\n\tconst result = (flag = yield a > b) === true;\n}',
		'function * foo() {\n\tconst result = (a > b, yield c > d) === false;\n}',
		'function * foo() {\n\tconst result = ((yield a > b) && c > d) === true;\n}',
		{
			code: 'function * foo() {\n\tconst result = ((yield value) as boolean) === true;\n}',
			languageOptions: {parser: parsers.typescript},
		},

		// Nullable or mixed TypeScript types are not guaranteed booleans.
		{
			code: 'let flag: boolean | undefined;\nflag === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: boolean | string;\nflag !== false;',
			languageOptions: {parser: parsers.typescript},
		},

		// A destructured parameter's type lives on the pattern, not the default value (#3385).
		{
			code: 'const foo = ({bar = false}: {bar?: boolean | \'baz\' | \'\'}) => {\n\tif (bar === false) {}\n\tif (bar === true) {}\n};',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const foo = ([first = false]: Array<boolean | \'baz\'>) => first === false;',
			languageOptions: {parser: parsers.typescript},
		},
		// The default value does not constrain a destructured binding's type.
		'function foo({bar = false}) {\n\treturn bar === false;\n}',
		// The default value does not constrain a parameter's type.
		'function foo(bar = false) {\n\treturn bar === false;\n}',
		// A destructured binding does not have the declarator initializer's type.
		'const {valueOf: condition} = true; condition === true;',
		// With type information, the wider type is respected and the comparison is not reported (#3385).
		typeAware('const foo = ({bar = false}: {bar?: boolean | \'baz\' | \'\'}) => bar === false;'),
	],
	invalid: [
		'const result = (a > b) === true;',
		'const result = (a > b) !== false;',
		'const result = (a > b) === false;',
		'const result = (a > b) !== true;',
		'const result = a > b === true;',
		'const result = a > b === false;',
		'const result = true === (a > b);',
		'const result = false !== (a > b);',
		'const result = false === (a > b);',
		'const result = true !== (a > b);',
		'if ((a > b) === true) {}',
		'if ((a > b) === false) {}',
		'const result = Boolean(value) === true;',
		'const result = !value === false;',
		'async function foo() {\n\tconst result = await (a > b) === false;\n}',
		'const result = (a > b && c > d) === true;',
		'const result = (a > b && c > d) === false;',
		'const result = (a > b ? c > d : e > f) === false;',
		'const result = (flag = a > b) === true;',
		'const result = (a > b, c > d) === false;',
		'const result = ([value].includes(value)) === true;',
		'const result = ((a > b) === true).toString();',
		'const result = ((a > b) === false).toString();',
		'const result = (a > b) /* comment */ === true;',
		'const flag = a > b;\nconst result = flag === true;',
		'function isEnabled() {\n\treturn a > b;\n}\n\nconst result = isEnabled() === true;',
		// With type information, a genuinely boolean destructured binding is detected via the type checker.
		typeAware('const foo = ({bar = false}: {bar?: boolean}) => bar === false;'),
		{
			code: 'let flag: boolean;\nconst result = flag === true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: true | false;\nconst result = false === flag;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = (flag as boolean) !== true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = <boolean>flag !== true;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const result = (flag satisfies boolean) === false;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'let flag: boolean;\nconst result = flag! === true;',
			languageOptions: {parser: parsers.typescript},
		},
		// Nested functions are not searched for `yield` expressions.
		'function * foo() {\n\tconst result = [a, b].some(item => item > c) === false;\n}',
	],
});
