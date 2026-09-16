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
		['a === b ? true : fallback()', '(a === b) || fallback()'],
		['a === b ? fallback() : false', '(a === b) && fallback()'],
		['value ? false : fallback()', '!value && fallback()'],
		['value ? fallback() : true', '!value || fallback()'],
		['const condition = () => true; condition() ? true : fallback()', 'const condition = () => true; condition() || fallback()'],
		['const array = []; array.some(predicate) ? true : fallback()', 'const array = []; array.some(predicate) || fallback()'],
		['const yes = true; a === b ? yes : fallback()', 'const yes = true; (a === b) || fallback()'],
		['const yes = true, alias = yes; a === b ? alias : fallback()', 'const yes = true, alias = yes; (a === b) || fallback()'],
		['const no = false; value ? no : fallback()', 'const no = false; !value && fallback()'],
		['const no = false; a === b ? fallback() : no', 'const no = false; (a === b) && fallback()'],
		['const yes = true; value ? fallback() : yes', 'const yes = true; !value || fallback()'],
		[
			'function isSubPath(pathA, pathB) { return pathA === "/" || pathA === pathB ? true : pathA.startsWith(pathB) && pathA[pathB.length] === "/"; }',
			'function isSubPath(pathA, pathB) { return pathA === "/" || pathA === pathB || (pathA.startsWith(pathB) && pathA[pathB.length] === "/"); }',
		],
	].map(([code, output]) => ({
		code,
		output,
		errors: [{messageId: 'prefer-logical-operator-over-ternary/error'}],
	})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'a === b ? true : fallback()',
			filename: 'file.ts',
		},
		{
			code: 'const condition = true; condition ? true : "fallback";',
			filename: 'file.js',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(condition: boolean) { return condition ? true : "fallback"; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware(outdent`
			declare function pick(value: true): 'literal';
			declare function pick(value: true | 'fallback'): 'union';
			const result: 'union' = pick(true ? true : 'fallback');
		`),
		typeAware('function f(a: number, b: number) { const result: true | 0 = ((a === b) as unknown) ? true : 0; return result; }'),
		typeAware('function f<T extends boolean>(condition: T) { return condition ? true : "x"; } const result: true | "x" = f(false);'),
		typeAware('function f<T extends boolean>(condition: T) { return condition ? "x" : false; } const result: false | "x" = f(false);'),
		typeAware('function f(condition: boolean) { if (condition) { return condition ? true : "fallback"; } }'),
		typeAware('declare const value: unknown; value as boolean ? true : "fallback";'),
		typeAware('declare const condition: boolean; export const result = condition ? true : "value";'),
		typeAware('declare const condition: boolean; export const result = condition ? false : "value";'),
		typeAware('declare const condition: boolean; export const result = condition ? "value" : false;'),
		typeAware('declare const condition: boolean; export const result = condition ? "value" : true;'),
		typeAware('declare function condition(): true; const result = condition() ? true : "fallback";'),
		typeAware('const result = true ? false : "fallback";'),
	].map(testCase => ({
		...testCase,
		errors: [{messageId: 'prefer-logical-operator-over-ternary/error'}],
	})),
});

test.snapshot({
	valid: [
		'const yes = true; condition ? yes : fallback()',
		'const no = false; condition ? fallback() : no',
		'let no = false; no = true; condition ? no : fallback()',
		'let no = false; condition ? no : fallback()',
		'var no = false; condition ? no : fallback()',
		'const no = 0; condition ? no : fallback()',
		'const {no = false} = true; a === b ? no : fallback()',
		'for (const no of [false]) { condition ? no : fallback(); }',
		'const no = false; function f(no) { return condition ? no : fallback(); }',
		'condition ? no : fallback(); const no = false;',
		'const no = alias; condition ? no : fallback(); const alias = false;',
		'const no = alias, alias = false; condition ? no : fallback()',
		'const no = (sideEffect(), false); condition ? no : fallback()',
		'f(); const yes = true; function f() { return flag === 1 ? yes : fallback(); }',
		'switch (kind) { case 0: const yes = true; break; case 1: result = flag === 1 ? yes : fallback(); }',
		'const yes = true; const no = false; a === b ? yes : no',
		{code: 'value ? (true as const) : (false as const)', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const condition: boolean; const result: string = condition ? (false as never) : "value";', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const condition: boolean; const result: string = condition ? (<never>false) : "value";', languageOptions: {parser: parsers.typescript}},
		{code: 'declare const condition: boolean; const result: string = condition ? (false as any) : "value";', languageOptions: {parser: parsers.typescript}},
		{code: 'const no = false as never; const alias = no; condition ? alias : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'const no: any = false; condition ? no : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'const yes = true; value ? fallback() : (yes as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? <boolean>false : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? (false as true) : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? (false as SomeType) : fallback()', languageOptions: {parser: parsers.typescript}},
		{
			code: outdent`
				declare const condition: boolean;
				declare function pick(value: false | string): number;
				declare function pick(value: boolean | string): string;
				const result: string = pick(condition ? (false as boolean) : 'value');
			`,
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const yes = true; const alias = yes; a === b ? alias : fallback()',
		'const no = false; const alias = no; value ? alias : fallback()',
		'const no = false; value ? /* keep */ no : fallback()',
		'const no = false; value ? (no) : fallback()',
		'const no = false; value ? no : (first(), fallback())',
		'const yes = true; if (guard) { result = flag === 1 ? yes : fallback(); }',
		{code: 'const no = false as const; value ? no : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'const no: false = false; value ? no : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? (false as const) : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? <const>false : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'const yes = true; value ? fallback() : (yes as true)', languageOptions: {parser: parsers.typescript}},
		{code: 'const no = false; a === b ? fallback() : no!', languageOptions: {parser: parsers.typescript}},
		{code: 'a === b ? (true satisfies boolean) : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? <false>false : fallback()', languageOptions: {parser: parsers.typescript}},
		{code: 'value ? (false /* keep */ as const) : fallback()', languageOptions: {parser: parsers.typescript}},
	],
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
		'condition ? fallback() : false',
		'"text" ? fallback() : false',
		'const {valueOf: condition} = true; condition ? true : fallback()',
		'const {constructor: condition} = () => true; condition("return 1") ? true : fallback()',
		'const [array] = [{some: () => 1}]; array.some() ? true : fallback()',
		'function f(condition = false) { return condition ? true : fallback(); }',
		'function f(condition = false) { const alias = condition; return alias ? fallback() : false; }',
		'function getCondition(condition = false) { return condition; } getCondition(1) ? true : fallback();',
		{
			code: 'const condition = true; const no = false; with (object) { condition ? true : fallback(); condition ? no : fallback(); }',
			languageOptions: {sourceType: 'script'},
		},
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
		{code: 'function f(condition: boolean = false) { return condition ? true : fallback(); }', languageOptions: {parser: parsers.typescript}},
		{code: '(condition as boolean) ? true : (value as boolean)', languageOptions: {parser: parsers.typescript}},
		{code: '(<boolean>condition) ? false : (<boolean>value)', languageOptions: {parser: parsers.typescript}},
		{code: 'function f(condition: boolean, value: boolean) { return (condition satisfies boolean) ? false : value; }', languageOptions: {parser: parsers.typescript}},
		{code: 'function f(condition: boolean, value: boolean) { return condition! ? value! : false; }', languageOptions: {parser: parsers.typescript}},
		typeAware('function f(object: {condition: boolean, value: boolean}) { return object.condition ? true : object.value; }'),
		typeAware('function f(condition = false) { return condition ? true : fallback(); }'),
		'a === b ? true : unknown',
		'a === b ? 1 : false',
		'a === b ? foo?.isValid() : false',
		'"text" ? false : 0',
		'0 ? "text" : true',
		'value ? false : /* keep */ fallback()',
		'value ? /* keep */ fallback() : true',
		'(first(), value) ? false : fallback()',
		'value ? false : (first(), fallback())',
		'Boolean(condition()) ? true : fallback()',
		'delete (value ? false : object.property)',
		'(value ? false : object.method)()',
		'(value ? false : object.tag)`template`',
		'value ? fallback ?? other : true',
		'first || second ? false : fallback()',
		{code: 'function f(value: string, fallback: number) { return value ? false : fallback; }', languageOptions: {parser: parsers.typescript}},
		{code: 'function f(value: string, fallback: number) { return value ? fallback : true; }', languageOptions: {parser: parsers.typescript}},
		{code: '(value as string) ? false : fallback()', languageOptions: {parser: parsers.typescript}},
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
