import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const SPACES_PLACEHOLDER = '/* */';
const cases = [
	'{/* */}',
	'function foo(){/* */}',
	'if(foo) {/* */}',
	'if(foo) {} else if (bar) {/* */}',
	'if(foo) {} else {/* */}',
	'for(;;){/* */}',
	'for(foo in bar){/* */}',
	'for(foo of bar){/* */}',
	'switch (foo) {case bar: {/* */}}',
	'switch (foo) {default: {/* */}}',
	'try {/* */} catch(foo){}',
	'try {} catch(bar){/* */}',
	'try {} catch(foo){} finally {/* */}',
	'do {/* */} while (foo)',
	'while (foo){/* */}',
	'foo = () => {/* */}',
	'foo = function (){/* */}',
	'foo = {/* */}',
	'class Foo {bar() {/* */}}',
	'foo = class {bar() {/* */}}',
	'class Foo {static  {/* */}}',
];
const classBodyCases = [
	'class Foo {/* */}',
	'foo = class {/* */}',
];
const allCases = [...cases, ...classBodyCases];

const ignoredCases = [
	'switch (foo) {/* */}',
	'const {/* */} = foo',
	'import {/* */} from "foo"',
];

test({
	valid: [
		...[
			'',
			'/* comment */',
			'\n\t// comment \n',
		].flatMap(body => allCases.map(code => code.replace(SPACES_PLACEHOLDER, body))),
		// Not empty
		...cases.map(code => code.replace(SPACES_PLACEHOLDER, 'unicorn')),
		...classBodyCases.map(code => code.replace(SPACES_PLACEHOLDER, 'baz() {}')),
		// `with`
		{
			code: 'with (foo) {}',
			languageOptions: {ecmaVersion: 5, sourceType: 'script'},
		},
		// We don't check these cases
		...ignoredCases.map(code => code.replace(SPACES_PLACEHOLDER, '   ')),
	],
	invalid: [
		...[
			' ',
			'\t',
			' \t \t ',
			'\n\n',
			'\r\n',
		].flatMap(spaces => allCases.map(code => ({
			code: code.replace(SPACES_PLACEHOLDER, spaces),
			output: code.replace(SPACES_PLACEHOLDER, ''),
			errors: 1,
		}))),
		// `with`
		{
			code: 'with (foo) {     }',
			output: 'with (foo) {}',
			errors: 1,
			languageOptions: {ecmaVersion: 5, sourceType: 'script'},
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			try {
				foo();
			} catch (error) {
				\u0020\u0020\u0020\u0020\u0020\u0020\u0020
			}
		`,
	],
});

const enableBabelPlugins = plugins => ({
	parserOptions: {
		babelOptions: {
			parserOpts: {
				plugins,
			},
		},
	},
});
const enableBabelPlugin = plugin => enableBabelPlugins([plugin]);
test.babel({
	valid: [],
	invalid: [
		{
			code: outdent`
				const foo = do     {
				};
			`,
			output: 'const foo = do     {};',
			languageOptions: enableBabelPlugin('doExpressions'),
			errors: 1,
		},
		{
			code: 'const record = #{    };',
			output: 'const record = #{};',
			languageOptions: enableBabelPlugin(['recordAndTuple', {syntaxType: 'hash'}]),
			errors: 1,
		},
		{
			code: 'const record = {|    |};',
			output: 'const record = {||};',
			languageOptions: enableBabelPlugin(['recordAndTuple', {syntaxType: 'bar'}]),
			errors: 1,
		},
		{
			code: outdent`
				class Foo {
					static    {
					}
				}
			`,
			output: outdent`
				class Foo {
					static    {}
				}
			`,
			languageOptions: enableBabelPlugin('classStaticBlock'),
			errors: 1,
		},
		// ESLint can't parse this now
		// {
		// 	code: 'const foo = module     {    };',
		// 	output: 'const foo = module     {};',
		// 	languageOptions: enableBabelPlugin('moduleBlocks'),
		// 	errors: 1
		// },
		{
			code: outdent`
				const foo = async    do    {
				};
			`,
			output: 'const foo = async    do    {};',
			languageOptions: enableBabelPlugins(['doExpressions', 'asyncDoExpressions']),
			errors: 1,
		},
	],
});
