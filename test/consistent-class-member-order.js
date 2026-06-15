import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';
import {DEFAULT_LANGUAGE_OPTIONS} from './utils/language-options.js';

const {ruleId, rule, test: ruleTest} = getTester(import.meta);

const customOrder = [
	'private-field',
	'public-field',
	'static-field',
	'constructor',
	'private-method',
	'public-method',
	'static-method',
	'static-block',
];

ruleTest.snapshot({
	valid: [
		'class Foo {}',
		'class Foo { #privateField = 1; }',
		'class Foo { publicField = 1; }',
		'class Foo { static staticField = 1; }',
		'class Foo { constructor() {} }',
		'class Foo { #privateMethod() {} }',
		'class Foo { publicMethod() {} }',
		'class Foo { static staticMethod() {} }',
		'class Foo { static {} }',
		outdent`
			class Unicorn {
				static staticField = 1;

				static {}

				static staticMethod() {}

				#privateField = 1;
				publicField = 1;

				constructor() {}

				#privateMethod() {}
				publicMethod() {}
			}
		`,
		outdent`
			const Foo = class {
				static a = 1;
				static #c = 2;

				static {}

				static a() {}
				static #f() {}

				#a = 1;
				#b = 2;
				a = 1;
				b = 2;

				constructor() {}

				#d() {}
				#e() {}
				a() {}
				b() {}
			};
		`,
		outdent`
			class SearchQuery {
				static escapeValue() {}
				static from() {}

				#queryParts = [];

				constructor() {}

				get() {}
			}
		`,
		outdent`
			class Foo {
				static get staticGetter() {}
				static set staticSetter(value) {}
				get #privateGetter() {}
				set #privateSetter(value) {}
				get publicGetter() {}
				set publicSetter(value) {}
			}
		`,
		{
			code: outdent`
				abstract class Foo {
					static staticField: string;

					static staticMethod(): void {}

					private privateField: string;
					protected protectedField: string;
					public publicField: string;
					declare declaredField: string;

					constructor() {}

					private privateMethod(): void {}
					abstract protected protectedMethod(): void;
					abstract public publicMethod(): void;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				class Foo {
					static accessor staticAccessor = 1;
					private accessor privateAccessor = 1;
					accessor publicAccessor = 1;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				class Foo {
					#privateField = 1;
					publicField = 1;
					static staticField = 1;

					constructor() {}

					#privateMethod() {}
					publicMethod() {}
					static staticMethod() {}

					static {}
				}
			`,
			options: [{order: customOrder}],
		},
		{
			code: outdent`
				class Foo {
					static staticField = 1;
					static {}
					field = 1;
				}
			`,
			options: [{}],
		},
	],
	invalid: [
		outdent`
			class Singleton {
				onePublicMethod() {}

				static getInstance() {}
			}
		`,
		// String literal key resolves to a name.
		outdent`
			class Foo {
				publicMethod() {}
				static 'create'() {}
			}
		`,
		// Numeric literal key resolves to a name.
		outdent`
			class Foo {
				publicMethod() {}
				static 1_000() {}
			}
		`,
		// Dynamic computed key falls back to the group label without a name.
		outdent`
			class Foo {
				publicMethod() {}
				static [getName()]() {}
			}
		`,
		// Getters and setters are named like other methods.
		outdent`
			class Foo {
				get publicValue() {}
				static set sharedValue(value) {}
			}
		`,
		outdent`
			class Foo {
				constructor() {}

				field = 1;
			}
		`,
		outdent`
			class Foo {
				publicField = 1;
				#privateField = 1;
			}
		`,
		outdent`
			class Foo {
				['computedField'] = 1;
				#privateField = 1;
			}
		`,
		outdent`
			class Foo {
				field = 1;
				static staticField = 1;
			}
		`,
		'class Foo { field = 1; static staticField = 1; }',
		outdent`
			class Foo {
				field = 1;
				// Keep this comment attached.
				static staticField = 1;
			}
		`,
		outdent`
			class Foo {
				publicMethod() {}
				#privateMethod() {}
			}
		`,
		outdent`
			class Foo {
				method() {}
				static staticMethod() {}
			}
		`,
		outdent`
			class Foo {
				static {}
				static staticField = 1;
			}
		`,
		outdent`
			class Foo {
				publicMethod() {}
				#privateMethod() {}
				constructor() {}
				publicField = 1;
				#privateField = 1;
				static {}
				static staticField = 1;
				static staticMethod() {}
			}
		`,
		{
			code: outdent`
				abstract class Foo {
					protected protectedField: string;
					private privateField: string;

					abstract public publicMethod(): void;
					private privateMethod(): void {}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				class Foo {
					accessor publicAccessor = 1;
					private accessor privateAccessor = 1;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				class Foo {
					static staticField = 1;
					publicField = 1;
				}
			`,
			options: [{order: customOrder}],
		},
	],
});

const verifyWithOrder = order => {
	const linter = new Linter();
	linter.verify(
		'class Foo {}',
		{
			languageOptions: DEFAULT_LANGUAGE_OPTIONS,
			plugins: {
				'rule-to-test': {
					rules: {
						[ruleId]: rule,
					},
				},
			},
			rules: {
				[`rule-to-test/${ruleId}`]: ['error', {order}],
			},
		},
	);
};

test('order option must contain each group exactly once', t => {
	t.throws(() => {
		verifyWithOrder(customOrder.slice(1));
	});
	t.throws(() => {
		verifyWithOrder([...customOrder.slice(0, -1), customOrder[0]]);
	});
	t.throws(() => {
		verifyWithOrder([...customOrder.slice(0, -1), 'unknown-group']);
	});
});
