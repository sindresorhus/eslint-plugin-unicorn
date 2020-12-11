import {outdent} from 'outdent';
import {flatten} from 'lodash';
import {test} from './utils/test';

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
	'try {} catch(foo){/* */}',
	'try {} catch(foo){} finally {/* */}',
	'do {/* */} while (foo)',
	'while (foo){/* */}',
	'foo = () => {/* */}',
	'foo = function (){/* */}',
	'function foo(){/* */}',
	'foo = {/* */}',
	'class Foo {bar() {/* */}}',
	'foo = class {bar() {/* */}}'
];
const classBodyCases = [
	'class Foo {/* */}',
	'foo = class {/* */}'
];
const allCases = [...cases, ...classBodyCases];

const ignoredCases = [
	'switch (foo) {/* */}',
	'const {/* */} = foo',
	'import {/* */} from "foo"'
];

test({
	valid: [
		...flatten([
			'',
			'/* comment */',
			'\n\t// comment \n'
		].map(body => allCases.map(code => code.replace(SPACES_PLACEHOLDER, body)))),
		// Not empty
		...cases.map(code => code.replace(SPACES_PLACEHOLDER, 'unicorn')),
		...classBodyCases.map(code => code.replace(SPACES_PLACEHOLDER, 'bar() {}')),
		// `with`
		{
			code: 'with (foo) {}',
			parserOptions: {ecmaVersion: 5, sourceType: 'script'}
		},
		// We don't check these cases
		...ignoredCases.map(code => code.replace(SPACES_PLACEHOLDER, '   '))
	],
	invalid: [
		...flatten([
			' ',
			'\t',
			' \t \t ',
			'\n\n',
			'\r\n'
		].map(spaces => allCases.map(code => ({
			code: code.replace(SPACES_PLACEHOLDER, spaces),
			output: code.replace(SPACES_PLACEHOLDER, ''),
			errors: 1
		})))),
		// `with`
		{
			code: 'with (foo) {     }',
			output: 'with (foo) {}',
			errors: 1,
			parserOptions: {ecmaVersion: 5, sourceType: 'script'}
		}
	]
});

test.visualize([
	outdent`
		try {
			foo();
		} catch (error) {
			\u0020\u0020\u0020\u0020\u0020\u0020\u0020
		}
	`
]);
