import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'no-complex-iteratee-expression';

test.snapshot({
	valid: [
		'for (const x of array) {}',
		'for (const x of obj.prop) {}',
		'for (const x of obj.prop.prop) {}',
		'for (const x of obj.prop.prop.prop) {}',
		'for (const x of obj.prop.prop.prop.method()) {}',
		'for (const x of obj.methodWithNoArgs()) {}',
		'for (const x of funcWithNoArgs()) {}',
		'for (const x of Object.keys(obj)) {}',
		'for (const x of Object.values(obj)) {}',
		'for (const [x, y] of Object.entries(obj)) {}'
	],
	invalid: [
		// Method call with arguments
		{
			code: 'for (const x of array.prop.prop.filter(shouldKeep)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of array.prop.prop.method(...someVariable)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of array.prop.prop.method(var1, { var2 })) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of array.filter(x => shouldKeep(x))) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of array.filter(shouldKeep)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of array.prop.prop.filter(x => shouldKeep(x))) {}',
			errors: [{messageId: MESSAGE_ID}]
		},

		// Function call with arguments
		{
			code: 'for (const x of func(abc)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},

		// Not-whitelisted Object methods
		{
			code: 'for (const x of Object.disallowed(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},

		// Allow non-object methods
		{
			code: 'for (const x of keys(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of entries(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of something.keys(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of something.values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},
		{
			code: 'for (const x of something.entries(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},

		// Comments
		{
			code: 'for (const x of /* A */ something /* B */ .method( /* C */ var_ /* D */) /* E */) {}',
			errors: [{messageId: MESSAGE_ID}]
		}
	]
});
