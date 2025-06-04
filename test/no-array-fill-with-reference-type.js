import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = "🦄";',
		'new Array(3).fill(0);        // ✓ number (primitive)  ',
		'new Array(3).fill(10n);        // ✓ bigint (primitive)  ',
		'new Array(3).fill(null);     // ✓ null (primitive)  ',
		'new Array(3).fill(undefined);     // ✓ undefined(primitive)  ',
		'new Array(3).fill(\'foo\');        // ✓ string (primitive)  ',
		'new Array(3).fill(``);        // ✓ TemplateLiteral (primitive)  ',
		// eslint-disable-next-line no-template-curly-in-string
		'new Array(3).fill(`${10}`);        // ✓ TemplateLiteral (primitive)',
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = "foo"; new Array(3).fill(`Hi ${foo}`);        // ✓ TemplateLiteral (primitive)',
		'new Array(3).fill(false);     // ✓ boolean (primitive)  ',
		'new Array(3).fill(Symbol(\'foo\'));        // ✓ Symbol(primitive)  ',

		'Array.from({ length: 3 }, () => ({})); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return {} }); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => (new Map)); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return new Map }); // ✓ Safe alternative',
		'Array.from({ length: 3 }, () => { return new Map() }); // ✓ Safe alternative',

		'Array(3).fill(0);        // ✓ number (primitive)',
		'new Foo(3).fill({});       // ✓ Not Array',
		'Foo(3).fill({});       // ✓ Not Array',

		// Below are the cases though have the same reference problem but are not covered by the rule.
		// Due to the rule name it will not check other than `Array.fill`, even if `Array.from` also fills in reference variable.
		// It cannot be exhaustively checked, we only check `Array.fill`.
		'const map = new Map(); Array.from({ length: 3 }, () => map);',
		`
		const map = new Map();
		const list = [];
		for (let i = 0; i < 3; i++) {
			list.push(map);
		}
		`,
	],
	invalid: [
		'new Array(3).fill([]);', // ✗ Array
		'new Array(3).fill(Array());', // ✗ Array
		'new Array(3).fill(new Array());', // ✗ Array
		'new Array(3).fill({});       // ✗ Object  ',
		'new Array(3).fill(new Map());       // ✗ Map',
		'new Array(3).fill(new Set());       // ✗ Set',
		'new Array(3).fill(/pattern/); // ✗ RegExp ',
		'new Array(3).fill(new String(\'fff\'));       // ✗ new String',

		'new Array(3).fill(new Foo(\'fff\'));       // ✗ new Class',
		'class BarClass {}; new Array(3).fill(BarClass);       // ✗ Class',
		'class BarClass {}; new Array(3).fill(new BarClass());       // ✗ Class instance',
		'new Array(3).fill(() => 1);       // ✗ arrow function',
		'new Array(3).fill(() => {});       // ✗ arrow function',
		`new Array(3).fill(() => {
			return {}
		});`,
		'new Array(3).fill(function () {});       // ✗ normal function',
		'const map = new Map(); new Array(3).fill(map);      // ✗ Variable (map)',

		'Array(3).fill({});       // ✗ Object  ',
		// ✗ Object
		'Array.from({ length: 3 }).fill({});',

		'new Array(3).fill(new Date())',
		'Array.from({ length: 3 }).fill(new Date())',

		'Array.from({length: 3}).fill(createError(\'no\', \'yes\')[0])',
	],
});
