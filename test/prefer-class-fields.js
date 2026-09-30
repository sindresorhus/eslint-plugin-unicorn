import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class Foo {bar = 1}',
		// Only the first statement is checked, the parent class could define a setter
		'class Foo extends Bar {constructor(message) {super(message); this.name = \'Foo\';}}',
		'class Foo {static bar = 1}',
		'class Foo {#bar = 1}',
		'class Foo {static #bar = 1}',
		// Not `=` assign
		'class Foo {constructor() {this.bar += 1}}',
		// Computed
		'class Foo {constructor() {this[bar] = 1}}',
		// Not `this`
		'class Foo {constructor() {notThis.bar = 1}}',
		// Not `Literal`
		'class Foo {constructor() {notThis.bar = 1 + 2}}',
		outdent`
			class Foo {
				constructor() {
					if (something) { return; }
					this.bar = 1;
				}
			}
		`,
	],
	invalid: [
		outdent`
			class Foo {
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				constructor() {
					;
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				constructor() {
					this.bar = 1;
					this.baz = 2;
				}
			}
		`,
		outdent`
			class Foo {
				constructor() {
					this.bar = 1;
					this.bar = 2;
				}
			}
		`,
		outdent`
			class Foo {
				bar;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				#bar;
				constructor() {
					this.#bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				bar = 0;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				#bar = 0;
				constructor() {
					this.#bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				[bar];
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				[bar] = 0;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				static bar;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				static bar = 0;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				static [bar];
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
				static [bar] = 1;
				constructor() {
					this.bar = 1;
				}
			}
		`,
		outdent`
			class Foo {
			constructor() {
				this.bar = 1;
			}}
		`,
		outdent`
			class Foo {
			constructor() {
				this.bar = 1;
			}
			static}
		`,
		outdent`
			class Foo {
			constructor() {
				this.bar = 1;
			}
			static// comment;
			}
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [
		outdent`
			class Foo {
				foo: string = 'foo';
			}
		`,
		outdent`
			declare class Foo {
				constructor(foo?: string);
			}
		`,
	],
	invalid: [
		outdent`
			class MyError extends Error {
				constructor(message: string) {
					this.name = "MyError";
				}
			}
		`,
		outdent`
			class MyError extends Error {
				name: string;
				constructor(message: string) {
					this.name = "MyError";
				}
			}
		`,
	],
});

// The inserted field uses the file's line ending
test({
	valid: [],
	invalid: [
		{
			code: 'class Foo {\r\n\tconstructor() {\r\n\t\tthis.bar = 1;\r\n\t}\r\n}\r\n',
			output: 'class Foo {\r\n\tconstructor() {\r\n\t}\r\n\tbar = 1;\r\n}\r\n',
			errors: 1,
		},
	],
});

test({
	valid: [],
	invalid: [
		// A `declare` field has no initializer, a definite assignment assertion can not have one either
		{
			code: outdent`
				class A {
					declare a: number;
					constructor() {
						this.a = 1;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: outdent`
				class A {
					a!: number;
					constructor() {
						this.a = 1;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			code: outdent`
				abstract class A {
					abstract a: number;
					constructor() {
						this.a = 1;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		{
			// An `accessor` field is a different kind of member, the assignment would be a second `a`
			code: outdent`
				class A {
					accessor a: number = 1;
					constructor() {
						this.a = 2;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
	],
});

// A `get`/`set` accessor on the prototype pair would be shadowed by a data field
test({
	valid: [],
	invalid: [
		...[
			outdent`
				class Foo {
					constructor() {
						this.name = 1;
					}

					set name(value) {
						this._name = value * 2;
					}

					get name() {
						return this._name;
					}
				}
			`,
			outdent`
				class Foo {
					constructor() {
						this.name = 1;
					}

					get name() {
						return 1;
					}
				}
			`,
			outdent`
				class Foo {
					static a = 1;

					constructor() {
						this.b = 2;
					}

					get b() {
						return 3;
					}
				}
			`,
			outdent`
				class Foo {
					constructor() {
						this.name = 1;
					}

					set name(value) {
						this._name = value * 2;
					}
				}
			`,
			'class Foo { constructor() { this.name = 1; } get name() { return 1; } }',
		].map(code => ({code, errors: 1})),
		{
			code: outdent`
				class Foo {
					constructor() {
						this.x = 1;
					}

					get y() {
						return 1;
					}
				}
			`,
			output: outdent`
				class Foo {
					constructor() {
					}

					get y() {
						return 1;
					}
					x = 1;
				}
			`,
			errors: 1,
		},
	],
});

// TypeScript emits a parameter property assignment at the top of the constructor, after the class field initializers
test({
	valid: [
		...[
			'class Point {\n\tconstructor(private readonly x: number) {\n\t\tthis.x = 0;\n\t}\n}',
			'class Point {\n\tconstructor(public x: number) {\n\t\tthis.x = 0;\n\t}\n}',
			'class Point {\n\tconstructor(private x = 5) {\n\t\tthis.x = 0;\n\t}\n}',
			'class Point {\n\tconstructor(private x: number = 5) {\n\t\tthis.x = 0;\n\t}\n}',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		{
			code: 'class A {\n\tconstructor() {\n\t\tthis.x = 1;\n\t}\n}',
			languageOptions: {parser: parsers.typescript},
			output: 'class A {\n\tconstructor() {\n\t}\n\tx = 1;\n}',
			errors: 1,
		},
		// A parameter property with a different name does not block the rewrite
		{
			code: 'class Point {\n\tconstructor(private x: number) {\n\t\tthis.y = 0;\n\t}\n}',
			languageOptions: {parser: parsers.typescript},
			output: 'class Point {\n\tconstructor(private x: number) {\n\t}\n\ty = 0;\n}',
			errors: 1,
		},
		// A private name is not the parameter property
		{
			code: 'class Point {\n\t#x;\n\tconstructor(private x: number) {\n\t\tthis.#x = 0;\n\t}\n}',
			languageOptions: {parser: parsers.typescript},
			output: 'class Point {\n\t#x = 0;\n\tconstructor(private x: number) {\n\t}\n}',
			errors: 1,
		},
		// An `accessor` field gets the initializer, not a second field
		{
			code: 'class A {\n\taccessor a;\n\tconstructor() {\n\t\tthis.a = 1;\n\t}\n}',
			languageOptions: {parser: parsers.typescript},
			output: 'class A {\n\taccessor a = 1;\n\tconstructor() {\n\t}\n}',
			errors: 1,
		},
	],
});

// `get 'bar'()` is the same accessor as `get bar()`, a field would shadow it
test({
	valid: [],
	invalid: [
		...[
			'class A { get \'bar\'() { return 1; } constructor() { this.bar = 1; } }',
			'class A { \'bar\' = 0; constructor() { this.bar = 1; } }',
		].map(code => ({code, errors: 1})),
		// A different accessor does not block the rewrite
		{
			code: 'class A { get \'baz\'() { return 1; } constructor() { this.bar = 1; } }',
			output: 'class A { get \'baz\'() { return 1; } constructor() {  } \n bar = 1;\n}',
			errors: 1,
		},
	],
});

// A private name is unique per class, a `static` member with that name is a duplicate
test({
	valid: [],
	invalid: [
		...[
			'class A { static #bar = 1; constructor() { this.#bar = 2; } }',
			'class A { static get #bar() { return 1; } constructor() { this.#bar = 2; } }',
			'class A { static #bar; constructor() { this.#bar = 2; } }',
		].map(code => ({code, errors: 1})),
		// A `static` public member is a different property, the rewrite is fine
		{
			code: 'class A { static bar = 1; constructor() { this.bar = 2; } }',
			output: 'class A { static bar = 1; constructor() {  } \n bar = 2;\n}',
			errors: 1,
		},
	],
});

// A `static {}` block is a class member without a key
test({
	valid: [],
	invalid: [
		{
			code: 'class A {\n\tstatic {\n\t\tinit();\n\t}\n\tconstructor() {\n\t\tthis.bar = 2;\n\t}\n}',
			output: 'class A {\n\tstatic {\n\t\tinit();\n\t}\n\tconstructor() {\n\t}\n\tbar = 2;\n}',
			errors: 1,
		},
	],
});

// The assignment is rebuilt as a field, a comment inside it would be lost
test({
	valid: [],
	invalid: [
		...[
			'class A { constructor() { this/* keep */.foo = 1; } }',
			'class A { constructor() { this.foo/* keep */ = 1; } }',
			'class A { constructor() { this.foo = /* keep */ 1; } }',
		].map(code => ({code, errors: 1})),
		// The suggestion would drop the comment too
		{
			code: 'class A { constructor() { this.foo /* keep */ = 1; } foo = 2; }',
			errors: [{messageId: 'prefer-class-fields/error', suggestions: []}],
		},
	],
});
