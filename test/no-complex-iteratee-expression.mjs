import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'no-complex-iteratee-expression';

test({
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
			code: 'for (const value of array.prop.prop.filter(shouldKeep)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.prop.prop.filter(shouldKeep);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of array.prop.prop.method(...someVariable)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.prop.prop.method(...someVariable);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of array.prop.prop.method(var1, { var2 })) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.prop.prop.method(var1, { var2 });
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of array.filter(x => shouldKeep(x))) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.filter(x => shouldKeep(x));
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of array.filter(shouldKeep)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.filter(shouldKeep);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of array.prop.prop.filter(x => shouldKeep(x))) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = array.prop.prop.filter(x => shouldKeep(x));
				for (const value of values) {}
			`
		},

		// Function call with arguments
		{
			code: 'for (const value of func(abc)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = func(abc);
				for (const value of values) {}
			`
		},

		// Not-whitelisted Object methods
		{
			code: 'for (const value of Object.disallowed(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = Object.disallowed(var_);
				for (const value of values) {}
			`
		},

		// Allow non-object methods
		{
			code: 'for (const value of keys(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = keys(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = values(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of entries(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = entries(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of something.keys(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = something.keys(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of something.values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = something.values(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of something.entries(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = something.entries(var_);
				for (const value of values) {}
			`
		},

		// Comments
		{
			code: 'for (const value of /* A */ something /* B */ .method( /* C */ var_ /* D */) /* E */) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = /* A */ something /* B */ .method( /* C */ var_ /* D */) /* E */;
				for (const value of values) {}
			`
		},

		// Can't auto-fix
		{
			code: 'for (const [x, y] of something.method(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		}
	]
});

test.snapshot([
	'for (const value of array.prop.prop.filter(shouldKeep)) {}',
	'for (const value of array.prop.prop.method(...someVariable)) {}',
	'for (const value of array.prop.prop.method(var1, { var2 })) {}',
	'for (const value of array.filter(x => shouldKeep(x))) {}',
	'for (const value of array.filter(shouldKeep)) {}',
	'for (const value of array.prop.prop.filter(x => shouldKeep(x))) {}',
	'for (const value of func(abc)) {}',
	'for (const value of Object.disallowed(var_)) {}',
	'for (const value of keys(var_)) {}',
	'for (const value of values(var_)) {}',
	'for (const value of entries(var_)) {}',
	'for (const value of something.keys(var_)) {}',
	'for (const value of something.values(var_)) {}',
	'for (const value of something.entries(var_)) {}',
	'for (const value of /* A */ something /* B */ .method( /* C */ var_ /* D */) /* E */) {}',
	'for (const [x, y] of something.method(var_)) {}'
]);
