import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

// Empty
test.snapshot({
	valid: [
		outdent`
			switch(foo){
				default: {
					break;
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					; // <- Not empty
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					{} // <- Not empty
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					break;
				}
			}
		`,
		{
			code: outdent`
				switch(foo){
					case 1:
						label: // <- Not empty
						{
						}
				}
			`,
			options: ['avoid'],
		},
		{
			code: outdent`
				switch(foo){
					case 1: {
					}
					; // <- Not empty
				}
			`,
			options: ['avoid'],
		},
	],
	invalid: [
		outdent`
			switch(foo){
				case 1: {
				}
				case 2: {
				}
				default: {
					doSomething();
				}
			}
		`,
		outdent`
			switch(foo){
				case 1: {
					// fallthrough
				}
				default: {
				}
				// fallthrough
				case 3: {
					doSomething();
					break;
				}
			}
		`,
	],
});

// Enforce braces
test.snapshot({
	valid: [
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
			}
		`,
	],
	invalid: [
		outdent`
			switch(foo) {
				default:
					doSomething();
			}
		`,
		outdent`
			switch(foo) {
				case 1: {
					doSomething();
				}
				break; // <-- This should be between braces;
			}
		`,
		outdent`
			switch(foo) {
				default:
					label: {}
			}
		`,
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				switch (foo) {
					case 'bar':
						doSomething(); // Comment about this line
				}
			`,
			output: outdent`
				switch (foo) {
					case 'bar': {
						doSomething(); // Comment about this line
					}
				}
			`,
			errors: [{messageId: 'switch-case-braces/missing'}],
		},
		{
			code: outdent`
				switch (foo) {
					case 'bar':
						doSomething();
						// Fall through
					case 'baz':
						doOtherThing();
				}
			`,
			output: outdent`
				switch (foo) {
					case 'bar': {
						doSomething();
					}
						// Fall through
					case 'baz': {
						doOtherThing();
					}
				}
			`,
			errors: [
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
			],
		},
	],
});

// Avoid braces
test.snapshot({
	valid: [
		outdent`
			switch(foo) {
				default: {
					var a;
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					function a() {}
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					const a = 1;
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					class A {}
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
				break;
			}
		`,
		{
			code: outdent`
				switch(foo) {
					default: {
						type Foo = string;
					}
					case 1: {
						interface Bar {}
					}
					case 2: {
						enum Baz {}
					}
					case 3: {
						namespace Qux {}
					}
					case 4: {
						declare function quux(): void;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	].map(testCase => typeof testCase === 'string'
		? {code: testCase, options: ['avoid']}
		: {...testCase, options: ['avoid']}),
	invalid: [
		outdent`
			switch(foo) {
				default: {
					doSomething();
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {
					{
						const bar = 2;
						doSomething();
					}
					doSomethingElse();
				}
			}
		`,
		outdent`
			switch(foo) {
				case 1: {
					break;
				}
			}
		`,
		outdent`
			switch(foo) {
				default: {{{
					doSomething();
				}}}
			}
		`,
		outdent`
			switch(foo) {
				default: {{{
					doSomething();
					{
						doSomethingElseInBlockStatement();
					}
				}}}
			}
		`,
	].map(code => ({code, options: ['avoid']})),
});

// Single statement
test({
	valid: [
		outdent`
			function unicorn(foo) {
				switch(foo) {
					case 1:
						break;
					case 2:
						return foo;
					case 3:
						throw new Error();
					case 4:
						doSomething();
				}
			}
		`,
		outdent`
			switch(foo) {
				case 1: {
					doSomething();
					break;
				}
				case 2: {
					const foo = 1;
				}
				case 3: {
					let foo = 1;
				}
				case 4: {
					class Foo {}
				}
				case 5: {
					function foo() {}
				}
			}
		`,
		outdent`
			function unicorn(foo) {
				switch(foo) {
					case 1:
					case 2:
						return foo;
				}
			}
		`,
		outdent`
			switch(foo) {
				case 1:
			}
		`,
		{
			code: outdent`
				switch(foo) {
					case 1: {
						type Foo = string;
					}
					case 2: {
						interface Bar {}
					}
					case 3: {
						enum Baz {}
					}
					case 4: {
						namespace Qux {}
					}
					case 5: {
						declare function quux(): void;
					}
				}
			`,
			languageOptions: {parser: parsers.typescript},
		},
	].map(testCase => typeof testCase === 'string'
		? {code: testCase, options: ['single-statement']}
		: {...testCase, options: ['single-statement']}),
	invalid: [
		{
			code: outdent`
				switch(foo) {
					case 1:
						doSomething();
						break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						doSomething();
						break;
					}
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/missing'}],
		},
		{
			code: outdent`
				function unicorn(foo) {
					switch(foo) {
						case 1: {
							return foo;
						}
						case 2: {
							break;
						}
						case 3: {
							var foo;
						}
						case 4: {
							doSomething();
						}
					}
				}
			`,
			output: outdent`
				function unicorn(foo) {
					switch(foo) {
						case 1:
							return foo;
						case 2:
							break;
						case 3:
							var foo;
						case 4:
							doSomething();
					}
				}
			`,
			options: ['single-statement'],
			errors: [
				{messageId: 'switch-case-braces/unnecessary'},
				{messageId: 'switch-case-braces/unnecessary'},
				{messageId: 'switch-case-braces/unnecessary'},
				{messageId: 'switch-case-braces/unnecessary'},
			],
		},
		{
			code: outdent`
				switch(foo) {
					case 1:
						const foo = 1;
					case 2:
						let bar = 1;
					case 3:
						class Baz {}
					case 4:
						function qux() {}
				}
			`,
			options: ['single-statement'],
			errors: [
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
			],
		},
		{
			code: outdent`
				switch(foo) {
					case 1:
						const foo = 1;
						doSomething(foo);
					case 2:
						let bar = 1;
						doSomething(bar);
					case 3:
						class Baz {}
						doSomething(Baz);
					case 4:
						function qux() {}
						doSomething(qux);
				}
			`,
			options: ['single-statement'],
			errors: [
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
			],
		},
		{
			code: outdent`
				switch(foo) {
					case 1:
						type Foo = string;
					case 2:
						interface Bar {}
					case 3:
						enum Baz {}
					case 4:
						namespace Qux {}
					case 5:
						declare function quux(): void;
					case 6:
						declare function corge(): void;
						doSomething(corge);
				}
			`,
			options: ['single-statement'],
			languageOptions: {parser: parsers.typescript},
			errors: [
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
				{messageId: 'switch-case-braces/missing'},
			],
		},
		{
			code: outdent`
				switch(foo) {
					case 1: {
					}
				}
			`,
			output: outdent`
				switch(foo) {
					case 1:
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/empty'}],
		},
		{
			code: outdent`
				switch(foo) {
					case 1:
						doSomething(); // Comment about this line
						break;
				}
			`,
			output: outdent`
				switch(foo) {
					case 1: {
						doSomething(); // Comment about this line
						break;
					}
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/missing'}],
		},
		{
			code: outdent`
				function unicorn(foo) {
					switch(foo) {
						case 1: {
							return foo; // Comment about this line
						}
					}
				}
			`,
			output: outdent`
				function unicorn(foo) {
					switch(foo) {
						case 1:
							return foo; // Comment about this line
					}
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/unnecessary'}],
		},
		{
			code: outdent`
				function unicorn(foo) {
					switch(foo) {
						case 1: {
							return foo;
						} // Comment about the block
					}
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/unnecessary'}],
		},
		{
			code: outdent`
				switch(foo) {
					case 1: {
					} // Comment about the block
				}
			`,
			options: ['single-statement'],
			errors: [{messageId: 'switch-case-braces/empty'}],
		},
	],
});
