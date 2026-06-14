import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
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
		outdent`
			const Foo = class {
				#a = 1;
				#b = 2;
				a = 1;
				b = 2;
				static a = 1;
				static #c = 2;

				constructor() {}

				#d() {}
				#e() {}
				a() {}
				b() {}
				static a() {}
				static #f() {}

				static {}
			};
		`,
		outdent`
			class Foo {
				get #privateGetter() {}
				set #privateSetter(value) {}
				get publicGetter() {}
				set publicSetter(value) {}
				static get staticGetter() {}
				static set staticSetter(value) {}
			}
		`,
		{
			code: outdent`
				abstract class Foo {
					private privateField: string;
					protected protectedField: string;
					public publicField: string;
					declare declaredField: string;
					static staticField: string;

					constructor() {}

					private privateMethod(): void {}
					abstract protected protectedMethod(): void;
					abstract public publicMethod(): void;
					static staticMethod(): void {}
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
					static accessor staticAccessor = 1;
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
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
				static staticField = 1;
				field = 1;
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
				static staticMethod() {}
				method() {}
			}
		`,
		outdent`
			class Foo {
				static {}
				static staticMethod() {}
			}
		`,
		outdent`
			class Foo {
				static staticMethod() {}
				constructor() {}
				#privateField = 1;
				publicField = 1;
				#privateMethod() {}
				publicMethod() {}
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
	],
});
