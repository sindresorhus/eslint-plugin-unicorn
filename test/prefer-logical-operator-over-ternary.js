import outdent from 'outdent';
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

test({
	valid: [],
	invalid: [
		['a === b ? true : c === d', '(a === b) || (c === d)'],
		['a === b ? false : c === d', '!(a === b) && (c === d)'],
		['a === b ? c === d : false', '(a === b) && (c === d)'],
		['a === b ? c === d : true', '!(a === b) || (c === d)'],
		[
			'function isSubPath(pathA: string, pathB: string) { return pathA === "/" || pathA === pathB ? true : pathA.startsWith(pathB) && pathA[pathB.length] === "/"; }',
			'function isSubPath(pathA: string, pathB: string) { return pathA === "/" || pathA === pathB || (pathA.startsWith(pathB) && pathA[pathB.length] === "/"); }',
			typeAware(''),
		],
	].map(([code, output, options]) => ({
		...options,
		code,
		output,
		errors: [{messageId: 'prefer-logical-operator-over-ternary/error'}],
	})),
});

test.snapshot({
	valid: [
		'condition ? true : false',
		'condition ? false : true',
		'condition ? true : true',
		'condition ? false : false',
		'a === b ? true : false',
		'a === b ? false : true',
		'a === b ? true : true',
		'a === b ? false : false',
		'condition ? true : a === b',
		'"text" ? true : a === b',
		'a === b ? true : unknown',
		'a === b ? 1 : false',
		'a === b ? foo?.isValid() : false',
		{code: 'function f(condition: string, value: boolean) { return condition ? true : value; }', languageOptions: {parser: parsers.typescript}},
		typeAware('function f(object: {condition: boolean | undefined, value: boolean}) { return object.condition ? true : object.value; }'),
	],
	invalid: [
		'const condition = a === b; const value = c === d; condition ? true : value',
		'a === b ? /* keep */ true : c === d',
		'a === b /* keep */ ? false : c === d',
		'a === b ? c === d : /* keep */ true',
		'((a === b)) ? true : ((c === d))',
		'!(a === b) ? false : c === d',
		'(a === b ? c === d : false).toString()',
		'a === b ? true : (c === d ? false : e === f)',
		'(a === b && c === d) ? true : e === f',
		'(a === b || c === d) ? e === f : false',
		'(sideEffect(), a === b) ? false : c === d',
		{code: 'const element = <div>{a === b ? true : c === d}</div>', languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}}},
		'const previous = foo\na === b ? true : c === d',
		{code: 'function f(condition: boolean, value: boolean) { return condition ? value : true; }', languageOptions: {parser: parsers.typescript}},
		{code: '(condition as boolean) ? true : (value as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: '(<boolean>condition) ? false : (<boolean>value)', languageOptions: {parser: parsers.typescript}},
		{code: 'function f(condition: boolean, value: boolean) { return (condition satisfies boolean) ? false : value; }', languageOptions: {parser: parsers.typescript}},
		{code: 'function f(condition: boolean, value: boolean) { return condition! ? value! : false; }', languageOptions: {parser: parsers.typescript}},
		typeAware('function f(object: {condition: boolean, value: boolean}) { return object.condition ? true : object.value; }'),
	],
});

test.snapshot({
	valid: [
		'foo ? foo1 : bar;',
		'foo.bar ? foo.bar1 : foo.baz',
		'foo.bar ? foo1.bar : foo.baz',
		'++foo ? ++foo : bar;',
		'foo == null ? foo : bar;',
		'foo == undefined ? foo : bar;',
		'foo == false ? bar : foo;',
		'foo == true ? foo : bar;',
		'foo == null ? foo : foo.bar;',
		'foo == undefined ? foo : foo.bar;',
		'foo === null ? bar : foo;',
		'foo === undefined ? bar : foo;',
		'foo !== null ? foo : bar;',
		'foo !== undefined ? foo : bar;',
		'foo === null || bar === undefined ? baz : foo;',
		'foo !== null && bar !== undefined ? foo : baz;',
		'foo === null && foo === undefined ? bar : foo;',
		'foo !== null || foo !== undefined ? foo : bar;',
		'foo === null || foo === null ? bar : foo;',
		'foo == null ? /* keep */ bar : foo;',
		'foo == null ? /* keep */ undefined : foo.bar;',
		'foo == null ? undefined : foo /* comment */ .bar;',
		'foo == null ? undefined : foo /* comment */ [bar];',
		'delete (foo == null ? undefined : foo.bar);',
		'(foo == null ? undefined : foo.bar)();',
		'(foo == null ? undefined : foo.bar)`tagged`;',
		'delete (foo != null ? foo.bar : undefined);',
		'(foo != null ? foo.bar : undefined)();',
		'(foo != null ? foo.bar : undefined)`tagged`;',
		{
			code: 'delete ((foo == null ? undefined : foo.bar) as unknown);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '((foo == null ? undefined : foo.bar) as (() => void))();',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '((foo == null ? undefined : foo.bar) as typeof tag)`tagged`;',
			languageOptions: {parser: parsers.typescript},
		},

		// Not checking
		'!!bar ? foo : bar;',
	],
	invalid: [
		'foo ? foo : bar;',
		// Report but do not offer a suggestion that would drop comments
		'foo ? foo /* keep me */ : bar;',
		'foo /* keep me */ ? foo : bar;',
		'!bar ? foo /* keep me */ : bar;',
		'foo.bar ? foo.bar : foo.baz',
		'foo?.bar ? foo.bar : baz',
		'!bar ? foo : bar;',
		'!!bar ? foo : !bar;',
		'foo == null ? bar : foo;',
		'foo == undefined ? bar : foo;',
		'null == foo ? bar : foo;',
		'undefined == foo ? bar : foo;',
		'foo != null ? foo : bar;',
		'null != foo ? foo : bar;',
		'foo != undefined ? foo : bar;',
		'undefined != foo ? foo : bar;',
		'foo === null || foo === undefined ? bar : foo;',
		'foo === undefined || foo === null ? bar : foo;',
		'foo === null || undefined === foo ? bar : foo;',
		'null === foo || undefined === foo ? bar : foo;',
		'foo !== null && foo !== undefined ? foo : bar;',
		'foo !== undefined && foo !== null ? foo : bar;',
		'foo !== null && undefined !== foo ? foo : bar;',
		'null !== foo && undefined !== foo ? foo : bar;',
		'foo == null ? undefined : foo.bar;',
		'foo == undefined ? undefined : foo.bar;',
		'foo != null ? foo.bar : undefined;',
		'foo != null ? foo[bar] : undefined;',
		'null != foo ? foo.bar : undefined;',
		'foo !== null && foo !== undefined ? foo.bar : undefined;',
		'foo !== null && undefined !== foo ? foo.bar : undefined;',
		'foo === null || foo === undefined ? undefined : foo.bar;',
		'foo == null ? undefined : foo[bar];',
		'foo == null ? undefined : (foo).bar;',
		'foo == null ? undefined : (foo)[bar];',
		'null == foo ? undefined : foo.bar;',
		'undefined == foo ? undefined : foo.bar;',

		'foo() ? foo() : bar',

		// Children parentheses
		'foo ? foo : a && b',
		'foo ? foo : a || b',
		'foo ? foo : a ?? b',
		'a && b ? a && b : bar',
		'a || b ? a || b : bar',
		'a ?? b ? a ?? b : bar',
		'foo ? foo : await a',
		'await a ? await a : foo',

		// ASI
		outdent`
			const foo = []
			!+a ? b : +a
		`,
		outdent`
			const foo = []
			a && b ? a && b : 1
		`,
		{
			code: '(foo as string) ? (foo as string) : bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo.bar as string) ? (foo.bar as string) : foo.baz',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(a && b as boolean) ? (a && b as boolean) : bar',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo! ? foo! : bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo.bar! ? foo.bar! : foo.baz',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo == null ? undefined : (foo as Foo).bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo == null ? undefined : (foo satisfies Foo).bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo as Foo) == null ? undefined : foo.bar;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo satisfies Foo) == null ? undefined : foo.bar;',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
