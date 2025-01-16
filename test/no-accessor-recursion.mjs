import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'function foo () { this.bar }',
		'function foo (value) { this.bar = value }',
		outdent`
			const foo = {
				bar() {
					this.bar = void 0;
					return this.bar;
				}
			};
		`,
		outdent`
			class Foo {
				foo() {
					this.foo = void 0;
					return this.foo;
				}
			}
		`,
	],
	invalid: [
		// Getter
		outdent`
			const foo = {
				get bar() {
					return this.bar;
				}
			};
		`,
		outdent`
			class Foo {
				get bar() {
					return this.bar;
				}
			}
		`,
		// Setter
		outdent`
			const foo = {
				set bar(value) {
					this.bar = value;
				}
			};
		`,
		outdent`
			class Foo {
				set bar(value) {
					this.bar = value;
				}
			}
		`,
	],
});
