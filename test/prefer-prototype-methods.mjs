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
		'const push = Array.prototype.push.bind(foo)'
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
	]
});
