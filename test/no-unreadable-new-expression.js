import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = new Foo();',
		'const foo = new Foo;',
		'const foo = new Foo(bar);',
		'const foo = new Foo(...bar);',
		'const foo = new Foo.Bar;',
		'const bar = new foo.Bar();',
		'const bar = new foo.bar.Baz();',
		'const formatter = new Intl.ListFormat("en-US", {type: "disjunction"});',
		'const foo = Foo().Bar;',
		'const foo = Foo().Bar();',
		'const foo = Foo.Bar();',
		'const foo = new Foo(); foo.getBar();',
		'const foo = new Foo(); const Bar = foo.Bar;',
		'const {Bar} = foo; const bar = new Bar();',
		'const Bar = foo.Bar; const bar = new Bar();',
		'const bar = Foo ? new Foo() : foo.Bar;',
	],
	invalid: [
		'const bar = new Foo().getBar();',
		'const bar = (new Foo()).getBar();',
		'const Bar = new Foo().Bar;',
		'const Bar = (new Foo()).Bar;',
		'const Bar = (new Foo).Bar;',
		'const Bar = new Foo()[Bar];',
		'const Bar = (new Foo())[Bar];',
		'const bar = (new Foo)?.getBar();',
		'const baz = new Foo().bar.baz;',
		'new Foo().bar`x`;',
		'const Bar = new (Foo().Bar);',
		'const bar = new foo[Bar]();',
		'const bar = (new foo).Bar();',
		'const bar = new foo().Bar();',
		'const bar = new (foo().Bar)();',
		'const bar = new (foo())();',
		'const bar = new (foo ? Foo : Bar)();',
		'const bar = new class {}();',
		'const timestamp = new Date().getTime();',
		'const formatted = new Intl.ListFormat("en-US", {type: "disjunction"}).format(words);',
	],
});

test.typescript({
	valid: [
		'const foo = new Foo<Type>();',
		'const foo = new Foo<Type>;',
	],
	invalid: [
		{
			code: 'const foo = new (Foo as typeof Bar)();',
			errors: 1,
		},
		{
			code: 'const bar = (new Foo<Type>()).bar;',
			errors: 1,
		},
	],
});
