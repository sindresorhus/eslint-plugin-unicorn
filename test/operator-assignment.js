/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo += bar;',
		'foo = `${foo}`;',
		'foo = `${bar} baz`;',
		'object.foo = `${object.foo} baz`;',
		'foo = `${/* keep */ foo} baz`;',
		'foo = `${foo /* keep */} baz`;',
		'foo /* keep */ = `${foo} baz`;',
		'foo = /* keep */ `${foo} baz`;',
		'(/* keep */ foo) = `${foo} baz`;',
		'foo = (`${foo} baz` /* keep */);',
		{
			code: 'foo += bar;',
			options: ['always'],
		},
		{
			code: 'foo = foo + bar;',
			options: ['never'],
		},
		{
			code: 'foo = `${foo} bar`;',
			options: ['never'],
		},
	],
	invalid: [
		'foo = foo + bar;',
		{
			code: 'foo += bar;',
			options: ['never'],
		},
		'foo = `${foo} bar`;',
		'foo = `${foo } bar`;',
		'foo = `${foo\n} bar`;',
		'foo = `${foo}${bar}`;',
		'foo = `${foo} ${/* keep */ bar}`;',
		'foo = `${foo} bar ${baz}`;',
	],
});
