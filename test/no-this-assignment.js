import {test} from './utils/test.js';

test.visualize({
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
		'function foo([a = this]) {}'
	],
	invalid: [
		'const foo = this;',
		'let foo;foo = this;',
		'var foo = bar, baz = this;'
	]
});
