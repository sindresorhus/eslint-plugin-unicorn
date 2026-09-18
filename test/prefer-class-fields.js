import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class Foo {bar = 1}',
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
