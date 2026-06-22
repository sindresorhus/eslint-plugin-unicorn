import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
		'function foo(bar = false) {\n\treturn bar === false;\n}',
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
	],
});
