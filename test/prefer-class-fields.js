import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-class-fields/error';

test.snapshot({
	valid: [
		'class Foo {bar = 1}',
		'class Foo {static bar = 1}',
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
				bar = 0;
				constructor() {
					this.bar = 1;
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
	],
});

test.typescript({
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
		{
			code: outdent`
				class MyError extends Error {
					constructor(message: string) {
						this.name = "MyError";
					}
				}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				class MyError extends Error {
					constructor(message: string) {
					}
					name = "MyError";
				}
			`,
		},
	],
});
