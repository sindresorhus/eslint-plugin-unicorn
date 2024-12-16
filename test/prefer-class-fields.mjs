import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-class-fields/error';

test.snapshot({
	valid: [
		outdent`
			class Foo {
				foo = 'foo';
			}
		`,
		outdent`
			class MyError extends Error {
				name = "MyError";
			}
		`,
	],
	invalid: [
		outdent`
			class Foo {
				constructor() {
					this.foo = 'foo';
				}
			}
		`,
		outdent`
			class Foo {
				constructor() {
					this.foo = 'foo';
					this.foo2 = 'foo2';
				}
			}
		`,
		outdent`
			class Foo {
				constructor(argument) {
					this.foo = 'foo';
					this.foo2 = argument + 'test';
					this.foo3 = 'foo3';
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor(message) {
					super(message);
					this.name = "MyError";
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
	],
	invalid: [
		{
			code: outdent`
				class MyError extends Error {
					constructor(message: string) {
						super(message);
						this.name = "MyError";
					}
				}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				class MyError extends Error {
					name = "MyError";
					constructor(message: string) {
						super(message);
					}
				}
			`,
		},
	],
});
