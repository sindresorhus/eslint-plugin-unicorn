import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo?.bar || foo?.baz;',
		'foo.bar || foo.baz;',
		'foo?.bar && foo.baz;',
		'foo.bar && foo.baz;',
		'foo?.bar || bar.baz;',
		'foo.bar && bar?.baz;',
		'foo?.bar() || foo.baz;',
		'foo?.bar || foo.baz();',
		'foo?.bar.baz || foo.bar.baz;',
		'foo?.bar || (foo.baz || foo.qux);',
		'foo?.bar ?? foo.baz;',
		{
			code: '(foo as Foo)?.bar && foo.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo!.bar || foo.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		'({}).foo && ({})?.bar;',
	],
	invalid: [
		'foo?.bar || foo.baz;',
		'foo.bar || foo?.baz;',
		'foo?.bar && foo?.baz;',
		'foo.bar && foo?.baz;',
		'foo?.[bar] || foo[bar];',
		'foo[bar] && foo?.[baz];',
		'foo[bar]?.baz || foo[bar].qux;',
		'this?.bar || this.baz;',
		'this.bar && this?.baz;',
		'class Foo extends Bar { baz() { super.foo?.bar || super.foo.baz; } }',
		'foo.bar?.baz || foo.bar.qux;',
		'(foo?.bar) || (foo.baz);',
		'foo?.bar || foo.baz || foo.qux;',
		'(foo)?.bar && (foo)?.baz;',
		'(foo).bar || (foo)?.baz;',
		'foo.bar && foo /* comment */ ?.baz;',
		'foo?.bar || foo /* comment */ .baz;',
		'foo?.[bar] || foo /* comment */ [baz];',
		'foo?.[bar] || foo[/* comment */ baz];',
		'(foo)?.[bar] || (foo)[baz];',
		{
			code: '(foo as Foo).bar || foo?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'foo!.bar || foo?.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(foo?.bar as Foo) || foo.baz;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '((foo?.bar) satisfies Foo) || foo.baz;',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
