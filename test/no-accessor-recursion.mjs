import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'function foo () { this.foo }',
		'function foo () { this.foo = bar }',
		outdent`
			const obj = {
				foo() {
					return this.foo;
				}
			};
		`,
		outdent`
			const obj = {
				foo(value) {
					this.foo = value;
				}
			};
		`,
	],
	invalid: [
		// Getter
		outdent`
			const obj = {
				get foo() {
					return this.foo;
				}
			};
		`,
		outdent`
			class Foo {
				get foo() {
					return this.foo;
				}
			}
		`,
		// Setter
		outdent`
			const obj = {
				set foo(value) {
					this.foo = value;
				}
			};
		`,
		outdent`
			class Foo {
				set foo(value) {
					this.foo = value;
				}
			}
		`,
	],
});
