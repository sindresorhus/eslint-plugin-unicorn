import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo.join(",")',
		'join()',
		'foo.join(...[])',
		'foo?.join()',
		'foo[join]()',
		'foo["join"]()',
		'[].join.call(foo, ",")',
		'[].join.call()',
		'[].join.call(...[foo])',
		'[].join?.call(foo)',
		'[]?.join.call(foo)',
		'[].join[call](foo)',
		'[][join].call(foo)',
		'[,].join.call(foo)',
		'[].join.notCall(foo)',
		'[].notJoin.call(foo)',
		'Array.prototype.join.call(foo, "")',
		'Array.prototype.join.call()',
		'Array.prototype.join.call(...[foo])',
		'Array.prototype.join?.call(foo)',
		'Array.prototype?.join.call(foo)',
		'Array?.prototype.join.call(foo)',
		'Array.prototype.join[call](foo, "")',
		'Array.prototype[join].call(foo)',
		'Array[prototype].join.call(foo)',
		'Array.prototype.join.notCall(foo)',
		'Array.prototype.notJoin.call(foo)',
		'Array.notPrototype.join.call(foo)',
		'NotArray.prototype.join.call(foo)',
		'path.join(__dirname, "./foo.js")',
	],
	invalid: [
		'foo.join()',
		'[].join.call(foo)',
		'[].join.call(foo,)',
		'[].join.call(foo , );',
		'Array.prototype.join.call(foo)',
		'Array.prototype.join.call(foo, )',
		outdent`
			(
				/**/
				[
					/**/
				]
					/**/
					.
					/**/
					join
					/**/
					.
					/**/
					call
					/**/
					(
						/**/
						(
							/**/
							foo
							/**/
						)
						/**/
						,
						/**/
					)/**/
			)
		`,
	],
});
