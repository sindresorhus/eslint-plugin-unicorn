import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const {property} = this;',
		'const property = this.property;',
		'const [element] = this;',
		'const element = this[0];',
		'([element] = this);',
		'element = this[0];',
		'property = this.property;',
		'const [element] = [this];',
		'([element] = [this]);',
		'const {property} = {property: this};',
		'({property} = {property: this});',
		'const self = true && this;',
		'const self = false || this;',
		'const self = false ?? this;',
		'foo.bar = this;',
		'function foo(a = this) {}',
		'function foo({a = this}) {}',
		'function foo([a = this]) {}',
	],
	invalid: [
		'const foo = this;',
		'let foo;foo = this;',
		'var foo = bar, baz = this;',
	],
});

test.babel({
	valid: [
		outdent`
			class A {
				foo = this;
			}
		`,
		outdent`
			class A {
				static foo = this;
			}
		`,
	],
	invalid: [],
});
