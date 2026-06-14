import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

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
