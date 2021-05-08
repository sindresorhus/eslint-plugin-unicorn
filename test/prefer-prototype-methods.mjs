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
		// False positive
		'Array["prototype"].slice.call();',
		'Array?.prototype.slice.call();',
		'window.Math.max.apply(null, numbers)'
	]
});
