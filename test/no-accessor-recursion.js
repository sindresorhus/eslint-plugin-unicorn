import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
		// Test computed property
		outdent`
			const foo = {
				get bar() {
					return this[bar];
				}
			};
		`,
		outdent`
			const foo = {
				get [bar]() {
					return this.bar;
				}
			};
		`,
		// Setter access in the right of AssignmentExpression
		outdent`
			const foo = {
				set bar(value) {
					a = this.bar;
				}
			};
		`,
		// Private field without recursion access
		outdent`
			class Foo{
				get bar() {
					return this.#bar;
				}

				get #bar() {
					return 0;
				}
			}
		`,
		// Destructuring assignment with computed property
		outdent`
			class Foo{
				get bar() {
					const {[bar]: bar} = this;
				}
			}
		`,
		// Static block
		outdent`
			const foo = {
				get bar() {
					class Foo {
						static {
							this.bar
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
		// Getter access in the right of AssignmentExpression
		outdent`
			const foo = {
				get bar() {
					a = this.bar;
				}
			};
		`,
		// Private field
		outdent`
			class Foo{
				get bar() {
					return this.#bar;
				}

				get #bar() {
					return this.#bar
				}
			}
		`,
		// Static getter
		outdent`
			class Foo{
				static get bar() {
					return this.bar;
				}
			}
		`,
		// Destructuring assignment within getter
		outdent`
			class Foo{
				get bar() {
					const {bar} = this;
				}

				get baz() {
					const {baz: baz1} = this;
				}
			}
		`,
		//
		...[
			'++ this.bar;',
			'this.bar --;',
			'[this.bar] = array;',
			'[this.bar = defaultValue] = array;',
			'({property: this.bar} = object);',
			'({property: this.bar = defaultValue} = object);',
		].map(code => outdent`
			class Foo {
				set bar(v) {
					${code}
				}
			}
		`),
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.babel,
			parserOptions: {
				babelOptions: {
					parserOpts: {
						plugins: [
							['destructuringPrivate'],
						],
					},
				},
			},
		},
	},
	valid: [],
	invalid: [
		outdent`
			class Foo {
				get #bar() {
					const {#bar: bar} = this;
				}
			}
		`,
	],
});
