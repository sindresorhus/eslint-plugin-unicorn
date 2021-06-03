import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = Array.prototype.push.apply(bar, elements);',
		'const foo = Array.prototype.slice.call(bar);',
		'const foo = Object.prototype.toString.call(bar);',
		'const foo = Object.prototype.hasOwnProperty.call(bar, "property");',
		'const foo = Object.prototype.propertyIsEnumerable.call(bar, "property");',
		'Array.prototype.forEach.call(foo, () => {})',
		'const push = Array.prototype.push.bind(foo)',
		'const push = [].push',
		'const {push} = []',
		'Math.max.apply(null, numbers)',
		'foo.apply(null, args)',
		'Reflect.apply(...[].slice)',
		'Reflect.apply(foo, [].slice)',
		'Reflect.apply(Math.max, Math, numbers)',
		'Reflect.apply()',
		'Reflect["apply"]([].slice, foo, [])',
		'NotReflect.apply([].slice, foo, [])',
		'Reflect.notApply([].slice, foo, [])',
		'Reflect.apply([]?.slice, foo, [])',
		// This better use `Foo.prototype.bar.call(baz)`, not handled
		'foo.constructor.prototype.bar.call(baz)'
	],
	invalid: [
		'const foo = [].push.apply(bar, elements);',
		'const foo = [].slice.call(bar);',
		'const foo = {}.toString.call(bar);',
		'const foo = {}.hasOwnProperty.call(bar, "property");',
		'const foo = {}.propertyIsEnumerable.call(bar, "property");',
		'[].forEach.call(foo, () => {})',
		'const push = [].push.bind(foo)',
		'const foo = bar.method.call(foo)',
		'const foo = bar[method].call(foo)',
		'const method = "realMethodName";const foo = bar[method].call(foo)',
		'const foo = [][method].call(foo)',
		'const method = "realMethodName";const foo = [][method].call(foo)',
		'const foo = [1].push.apply(bar, elements);',
		'const array = Reflect.apply([].slice, foo, [])',
		'Reflect.apply(foo.bar, baz, [])',
		// False positive
		'Array["prototype"].slice.call();',
		'Array?.prototype.slice.call();',
		'window.Math.max.apply(null, numbers)'
	]
});

// Object method
test.snapshot({
	valid: [
		outdent`
			const foo = {
				a() {
					this.method = this.method.bind(this);
				},
				b: function() {
					this.method = this.method.bind(this);
				},
				c() {
					const foo = () => this.method.bind(this);
				},
				d: {
					d1() {
						this.method.call(this);
					}
				}
			}
		`,
		outdent`
			const foo = {};
			const bar = foo.method.call(foo, 'property');
		`,
		'({method() {}}).method.call(foo)'
	],
	invalid: [
		outdent`
			const foo = {
				a: () => {
					this.method = this.method.bind(this);
				}
			}
		`,
		outdent`
			const {foo} = {foo: {}};
			const bar = foo.method.call(foo, 'property');
		`,
		outdent`
			const [foo] = [{}];
			const bar = foo.method.call(foo, 'property');
		`,
		outdent`
			const foo = {
				a() {
					this.propertyIsEnumerable.apply(this, []);
				}
			}
		`,
		outdent`
			const foo = {
				a() {
					function fn() {
						// this is not the object foo
						this.method.call(this);
					}
					return fn;
				}
			}
		`,
		'this.method = this.method.bind(this)',
		outdent`
			const foo = {};
			const bar = foo.hasOwnProperty.call(foo, 'property');
		`,
		'for (const foo of []) foo.bar.call(foo)',
		outdent`
			let foo = {};
			const bar = foo.method.call(foo, 'property');
		`,
		'({method() {}}).propertyIsEnumerable.call(foo)'
	]
});

test.babel({
	testerOptions: {
		env: {es2021: true}
	},
	valid: [],
	invalid: [
		{
			code: 'Reflect.apply(foo[Symbol()], baz, [])',
			errors: [{message: 'Prefer using method from the constructor prototype.'}]
		},
		{
			code: 'Reflect.apply(foo[Symbol("symbol description")], baz, [])',
			errors: [{message: 'Prefer using method from the constructor prototype.'}]
		},
		{
			code: 'Reflect.apply([][Symbol()], baz, [])',
			output: 'Reflect.apply(Array.prototype[Symbol()], baz, [])',
			errors: [{message: 'Prefer using method from `Array.prototype`.'}]
		},
		{
			code: 'Reflect.apply({}[Symbol("symbol description")], baz, [])',
			output: 'Reflect.apply(Object.prototype[Symbol("symbol description")], baz, [])',
			errors: [{message: 'Prefer using method from `Object.prototype`.'}]
		},
		{
			code: '[][Symbol.iterator].call(foo)',
			output: 'Array.prototype[Symbol.iterator].call(foo)',
			errors: [{message: 'Prefer using `Array.prototype.Symbol(Symbol.iterator)`.'}]
		}
	]
});
