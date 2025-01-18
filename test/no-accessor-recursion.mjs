import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'function foo () { this.bar }',
		'function foo () { this.foo }',
		'function foo (value) { this.bar = value }',
		'this.foo = foo',
		outdent`
			{
				this.foo = foo;		
			}
		`,
		'this.foo = function () { this.foo }',
		'const foo = () => this.foo',
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
		// Deep property setter
		outdent`
			class Foo {
				set bar(value) {
					this.bar.baz = value;
				}
			}
		`,
		// Define this to alias
		outdent`
			class Foo {
				get bar() {
					const self = this;
					return self.bar;
				}
			}
		`,
		outdent`
			class Foo {
				set bar(value) {
					const self = this;
					return self.bar = value;
				}
			}
		`,
		outdent`
			const foo = {
				get bar() {
					return this._bar;
				}
			};
		`,
		// Access this in function scope
		outdent`
			const foo = {
				get bar() {
					function baz() {
						return this.bar;
					}
				}
			};
		`,
		// Nest getter
		outdent`
			const foo = {
				get bar() {
					const qux = {
						get quux () {
							return this.bar;
						}
					}
				}
			};
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
		// Deep property getter
		outdent`
			const foo = {
				get bar() {
					return this.bar.baz;
				}
			};
		`,
		// Access this in nest block
		outdent`
			const foo = {
				get bar() {
					if (true) {
						return this.bar;
					}
				}
			};
		`,
		// Access this in arrow function scope
		outdent`
			const foo = {
				get bar() {
					const baz = () => {
						return this.bar;
					}
				}
			};
		`,
		outdent`
			const foo = {
				get bar() {
					const baz = () => {
						return () => {
							return this.bar;
						}
					}
				}
			};
		`,
	],
});
