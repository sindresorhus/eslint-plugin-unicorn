import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			class Foo {
				name;
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				get name() {
					return 'foo';
				}
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				value;
				set name(value) {
					this.value = value;
				}
				setName(name) {
					this.name = name;
				}
			}
		`,
		outdent`
			class Foo {
				name() {}
				callName() {
					this.name();
				}
			}
		`,
		outdent`
			class Foo {
				constructor(name) {
					this.name = name;
				}
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo extends Bar {
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				getName() {
					function getName() {
						return this.name;
					}

					return getName();
				}
			}
		`,
		outdent`
			class Foo {
				#name;
				getName() {
					return this.#name;
				}
			}
		`,
		outdent`
			class Foo {
				getName(name) {
					return this[name];
				}
			}
		`,
		outdent`
			class Foo {
				constructor(data) {
					Object.assign(this, data);
				}
			}
		`,
		outdent`
			class Foo {
				static getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				static {
					this.name = 'foo';
				}
			}
		`,
		outdent`
			class Foo {
				getConstructor() {
					return this.constructor;
				}
			}
		`,
	],
	invalid: [
		outdent`
			class Foo {
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				callName() {
					this.name();
				}
			}
		`,
		outdent`
			class Foo {
				callName() {
					this.name?.();
				}
			}
		`,
		outdent`
			class Foo {
				getName() {
					return this?.name;
				}
			}
		`,
		outdent`
			class Foo {
				name = this.value;
			}
		`,
		outdent`
			class Foo {
				setName(name) {
					this.name = name;
				}
			}
		`,
		outdent`
			class Foo {
				setName(name) {
					this.name += name;
				}
			}
		`,
		outdent`
			class Foo {
				setName() {
					this.name++;
				}
			}
		`,
		outdent`
			class Foo {
				getName() {
					return () => this.name;
				}
			}
		`,
		outdent`
			class Foo {
				constructor() {
					this.name = this.value;
				}
			}
		`,
		outdent`
			class Foo {
				constructor(callbacks) {
					callbacks.push(() => {
						this.name = 'foo';
					});
				}
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				setName(name) {
					this.name = name;
					this.name = name.trim();
				}
			}
		`,
		outdent`
			class Foo {
				// Sets the name.
				setName(name) {
					this.name = name;
				}
			}
		`,
		'class Foo { setName(name) { this.name = name; } }',
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
				declare name: string;
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			abstract class Foo {
				abstract name: string;
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				constructor(public name: string) {}
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				constructor(protected count = 0) {}
				getCount() {
					return this.count;
				}
			}
		`,
	],
	invalid: [
		outdent`
			class Foo {
				constructor(name: string) {}
				getName() {
					return this.name;
				}
			}
		`,
		outdent`
			class Foo {
				getName() {
					return this.name as string;
				}
			}
		`,
		outdent`
			class Foo {
				getName() {
					return this!.name;
				}
			}
		`,
	],
});
