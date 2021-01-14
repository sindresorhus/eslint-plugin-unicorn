import {test} from './utils/test.js';

test.visualize({
	valid: [
		'Array.isArray(arr)',
		'arr instanceof Object',
		'arr instanceof array',
		'a instanceof \'array\'',
		'a instanceof ArrayA',
		'a.x[2] instanceof foo()',
		'Array.isArray([1,2,3]) === true',
		'"arr instanceof Array"'
	],
	invalid: [
		'arr instanceof Array',
		'[] instanceof Array',
		'[1,2,3] instanceof Array === true',
		'fun.call(1, 2, 3) instanceof Array',
		'obj.arr instanceof Array',
		'foo.bar[2] instanceof Array'
	]
});
