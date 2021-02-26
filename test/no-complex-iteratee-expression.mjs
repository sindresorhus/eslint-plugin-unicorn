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

		// Sequence expressions
		{
			code: 'for (const value of (0, [1, 2])) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = (0, [1, 2]);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of (0, 1, [1, 2], [1, 2])) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = (0, 1, [1, 2], [1, 2]);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of ( 0, [1])) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = (0, [1]);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of ((0, [1]))) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = (0, [1]);
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
		{
			code: 'for (const value of Object.mykeys(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = Object.mykeys(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of Object.keysXx(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = Object.keysXx(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of Object.Values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = Object.Values(var_);
				for (const value of values) {}
			`
		},
		{
			code: 'for (const value of Object.myEntries(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = Object.myEntries(var_);
				for (const value of values) {}
			`
		},

		// Forbid non-object methods
		{
			code: 'for (const value of values(var_)) {}',
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values_ = values(var_);
				for (const value of values_) {}
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
				const values = something /* B */ .method( /* C */ var_ /* D */);
				for (const value of /* A */ values /* E */) {}
			`
		},

		// Autofix adds braces
		// We can't test "with ()" because of the strict mode
		{
			code: outdent`
				if (something)
					for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				if (something)
					{const values = invalid(var_);
					for (const value of values) {}}
			`
		},
		{
			code: outdent`
				if (something)
					for (const value of invalid(var_)) {}
				else
					somethingElse();
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				if (something)
					{const values = invalid(var_);
					for (const value of values) {}}
				else
					somethingElse();
			`
		},
		{
			code: outdent`
				if (something)
					somethingElse();
				else
					for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				if (something)
					somethingElse();
				else
					{const values = invalid(var_);
					for (const value of values) {}}
			`
		},
		{
			code: outdent`
				if (something) for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				if (something) {const values = invalid(var_);
				 for (const value of values) {}}
			`
		},
		{
			code: outdent`
				for (const val of vals)
					for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				for (const val of vals)
					{const values = invalid(var_);
					for (const value of values) {}}
			`
		},
		{
			code: outdent`
				while (true)
					for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				while (true)
					{const values = invalid(var_);
					for (const value of values) {}}
			`
		},
		{
			code: outdent`
				do
					for (const value of invalid(var_)) {}
				while (true);
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				do
					{const values = invalid(var_);
					for (const value of values) {}}
				while (true);
			`
		},
		{
			code: outdent`
				if (something) for (const value of invalid(var_)) {}
				else somethingElse();
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				if (something) {const values = invalid(var_);
				 for (const value of values) {}}
				else somethingElse();
			`
		},
		{
			code: outdent`
				if (something) for (const value of invalid(var_)) {}
				else for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
			output: outdent`
				if (something) {const values = invalid(var_);
				 for (const value of values) {}}
				else {const values = invalid(var_);
				 for (const value of values) {}}
			`
		},
		{
			code: outdent`
				switch (something) {
					case 'a':
						for (const value of invalid(var_)) {}
				}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				switch (something) {
					case 'a':
						{const values = invalid(var_);
						for (const value of values) {}}
				}
			`
		},

		// Can't auto-fix because of invalid iterated element
		{
			code: 'for (const [x, y] of something.method(var_)) {}',
			errors: [{messageId: MESSAGE_ID}]
		},

		// Autofix with new variable name
		{
			code: outdent`
				const values = [];
				for (const value of invalid(var_)) {}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = [];
				const values_ = invalid(var_);
				for (const value of values_) {}
			`
		},
		{
			code: outdent`
				const values = [];
				if (something) {
					for (const value of invalid(var_)) {}
				}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = [];
				if (something) {
					const values_ = invalid(var_);
					for (const value of values_) {}
				}
			`
		},
		{
			code: outdent`
				const values = [];
				function a() {
					for (const value of invalid(var_)) {}
				}
			`,
			errors: [{messageId: MESSAGE_ID}],
			output: outdent`
				const values = [];
				function a() {
					const values_ = invalid(var_);
					for (const value of values_) {}
				}
			`
		}
	]
});
