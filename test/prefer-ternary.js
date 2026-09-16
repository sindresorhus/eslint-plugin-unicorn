import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const messageId = 'prefer-ternary';
const suggestionMessageId = 'prefer-ternary/suggestion';
const errors = [{messageId}];
const errorsWithSuggestion = output => [
	{
		messageId,
		suggestions: [
			{
				messageId: suggestionMessageId,
				output,
			},
		],
	},
];

const onlySingleLineOptions = ['only-single-line'];

// ReturnStatement
test({
	valid: [
		'function unicorn() { if (test) { return value; } else { return; } }',
		'function unicorn() { if (/* explanation */ test) { return a; } else { return b; } }',
		'function unicorn() { if (test) { return a; } else { /* explanation */ return b; } }',
		// Test is Ternary
		outdent`
			function unicorn() {
				if(a ? b : c){
					return a;
				} else{
					return b;
				}
			}
		`,
		// Consequent is Ternary
		outdent`
			function unicorn() {
				if(test){
					return a ? b : c;
				} else{
					return b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			function unicorn() {
				if(test){
					return a;
				} else{
					return a ? b : c;
				}
			}
		`,
		outdent`
			function unicorn() {
				if (test) {
					return true;
				} else {
					return false;
				}
			}
		`,
		'function unicorn() { if (test) return true; else return false; }',
		outdent`
			function unicorn() {
				if(test){
					return;
				} else{
					return b;
				}
			}
		`,
		outdent`
			function unicorn() {
				if(test){
					return;
				} else{
					return;
				}
			}
		`,
		outdent`
			async function unicorn() {
				if(test){
					return;
				} else{
					return await b;
				}
			}
		`,
	],
	invalid: [
		{
			code: 'function unicorn() { if (item => normalize(item)) { return a; } else { return b; } }',
			output: 'function unicorn() { return (item => normalize(item)) ? a : b; }',
			errors,
		},
		{
			code: 'function unicorn() { if ((item => normalize(item))) { return a; } else { return b; } }',
			output: 'function unicorn() { return (item => normalize(item)) ? a : b; }',
			errors,
		},
		{
			code: 'function unicorn() { if (test) { return undefined; } else { return b; } }',
			output: 'function unicorn() { return test ? undefined : b; }',
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						return a;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? a : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						return await a;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					return test ? (await a) : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						return await a;
					} else{
						return await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					return test ? (await a) : (await b);
				}
			`,
			errors,
		},
		// Crazy nested
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						return yield await (foo = a);
					} else{
						return yield await (foo = b);
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					return test ? (yield await (foo = a)) : (yield await (foo = b));
				}
			`,
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						return (foo as string);
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? (foo as string) : b;
				}
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function unicorn() {
					if(test as boolean){
						return foo;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return (test as boolean) ? foo : b;
				}
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			// `satisfies` binds tighter than `?:`, so no parentheses are needed in the test position
			code: outdent`
				function unicorn() {
					if(test satisfies boolean){
						return foo;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test satisfies boolean ? foo : b;
				}
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						return foo!;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? foo! : b;
				}
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: outdent`
				function unicorn() {
					if(test!){
						return foo;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test! ? foo : b;
				}
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// Flat ReturnStatement
test({
	valid: [
		'function unicorn() { if (test) { return value; } return; }',
		'function unicorn() { if (test) { return a; } doSomething(); return b; }',
		'function unicorn() { if (test) { doSomething(); return a; } return b; }',
		'function unicorn() { if (a ? b : c) { return a; } return b; }',
		'function unicorn() { if (test) { return a ? b : c; } return b; }',
		'function unicorn() { if (test) { return a; } return b ? c : d; }',
		'function unicorn() { if (test) { return true; } return false; }',
		{
			code: outdent`
				function unicorn() {
					if (test) {
						return format(
							value,
						);
					}
					return b;
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				function unicorn() {
					if (test) {
						return a;
					}
					return format(
						value,
					);
				}
			`,
			options: onlySingleLineOptions,
		},
		'function unicorn() { if (test) return; return; }',
		'function unicorn() { if (test) return; return value; }',
		'function unicorn() { if (test) { return /* comment */ a; } return b; }',
		'function unicorn() { if (test) { return a; } return /* comment */ b; }',
		outdent`
			function unicorn() {
				if (test) {
					return a;
				}
				// comment
				return b;
			}
		`,
		outdent`
			function unicorn() {
				if (test) {
					return a;
				}
				return b; // comment
			}
		`,
	],
	invalid: [
		{
			code: 'function unicorn() { if (test) { return a; } return b; }',
			output: 'function unicorn() { return test ? a : b; }',
			errors,
		},
		{
			code: 'function unicorn() { if (test) return 1; return 2; }',
			output: 'function unicorn() { return test ? 1 : 2; }',
			errors,
		},
		{
			code: 'function unicorn() { if (test) return true; return value; }',
			output: 'function unicorn() { return test ? true : value; }',
			errors,
		},
		{
			code: 'async function unicorn() { if (test) return await a; return b; }',
			output: 'async function unicorn() { return test ? (await a) : b; }',
			errors,
		},
		{
			code: 'async function unicorn() { if (test) return a; return await b; }',
			output: 'async function unicorn() { return test ? a : (await b); }',
			errors,
		},
		{
			code: 'function* unicorn() { if (test) return yield a; return b; }',
			output: 'function* unicorn() { return test ? (yield a) : b; }',
			errors,
		},
		{
			code: 'function unicorn() { if (test) return (foo as string); return b; }',
			output: 'function unicorn() { return test ? (foo as string) : b; }',
			errors,
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function unicorn() { if (a) return 1; if (b) return 2; return 3; }',
			output: 'function unicorn() { if (a) return 1; return b ? 2 : 3; }',
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if (test) {
						return a;
					}
					return b;
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? a : b;
				}
			`,
			options: onlySingleLineOptions,
			errors,
		},
	],
});

// Unsupported top-level statements
test({
	valid: [
		outdent`
			function* unicorn() {
				if(test){
					yield a;
				} else{
					yield b;
				}
			}
		`,
		outdent`
			function* unicorn() {
				if(test){
					yield* a;
				} else {
					yield* b;
				}
			}
		`,
		outdent`
			async function unicorn() {
				if(test){
					await doSomething1();
				} else{
					await doSomething2();
				}
			}
		`,
		outdent`
			async function unicorn(packageUUID, client, data) {
				if (packageUUID) {
					await client.put(\`api/bricks/\${packageUUID}/\`, data);
				} else {
					await client.post('api/bricks/', data);
				}
			}
		`,
		outdent`
			function unicorn() {
				if (test) {
					throw new Error('a');
				} else {
					throw new TypeError('a');
				}
			}
		`,
		{
			code: outdent`
				function* unicorn() {
					if (test) {
						yield a;
					} else {
						yield b;
					}
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				async function unicorn() {
					if (test) {
						await a();
					} else {
						await b();
					}
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				function unicorn() {
					if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			options: onlySingleLineOptions,
		},
	],
	invalid: [],
});

// AssignmentExpression
test({
	valid: [
		// Different `left`
		outdent`
			function unicorn() {
				if(test){
					foo = a;
				} else{
					bar = b;
				}
			}
		`,
		// Different `operator`
		outdent`
			function unicorn() {
				if(test){
					foo = a;
				} else{
					foo *= b;
				}
			}
		`,
		// Not same `left`
		outdent`
			function unicorn() {
				if(test){
					foo().bar = a;
				} else{
					foo().bar = b;
				}
			}
		`,
		// Test is Ternary
		outdent`
			function unicorn() {
				if(a ? b : c){
					foo = a;
				} else{
					foo = b;
				}
			}
		`,
		// Consequent is Ternary
		outdent`
			function unicorn() {
				if(test){
					foo = a ? b : c;
				} else{
					foo = b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			function unicorn() {
				if(test){
					foo = a;
				} else{
					foo = a ? b : c;
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				function unicorn() {
					if(test){
						foo = a;
					} else{
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					foo = test ? a : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						foo *= a;
					} else{
						foo *= b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					foo *= test ? a : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						foo = await a;
					} else{
						foo = b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					foo = test ? (await a) : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						foo = await a;
					} else{
						foo = await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					foo = test ? (await a) : (await b);
				}
			`,
			errors,
		},
		// Same `left`
		{
			code: outdent`
				function unicorn() {
					if (test) {
						foo.bar = a;
					} else{
						foo.bar = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					foo.bar = test ? a : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					a()
					if (test) {
						(foo)['b' + 'ar'] = a
					} else{
						foo.bar = b
					}
				}
			`,
			output: outdent`
				function unicorn() {
					a()
					;(foo)['b' + 'ar'] = test ? a : b;
				}
			`,
			errors,
		},
		// Crazy nested
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						foo = yield await a;
					} else{
						foo = yield await b;
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					foo = test ? (yield await a) : (yield await b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				if(test){
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					_STOP_ =
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					1;
				} else{
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					_STOP_2_ =
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					2;
				}
			`,
			output: outdent`
				$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 = test ? (_STOP_ =
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					1) : (_STOP_2_ =
					$0 |= $1 ^= $2 &= $3 >>>= $4 >>= $5 <<= $6 %= $7 /= $8 *= $9 **= $10 -= $11 += $12 =
					2);
			`,
			errors,
		},
		{
			code: outdent`
				unrelatedStatement()
				if (foo) {
					;(bar.baz as any) = 'string'
				} else {
					bar.baz = 2
				}
			`,
			output: outdent`
				unrelatedStatement()
				;(bar.baz as any) = foo ? 'string' : 2;
			`,
			errors,
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `only-single-line`
test({
	valid: [
		{
			code: outdent`
				if (test) {
					a = format(
						value,
					);
				} else{
					a = foo;
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				if (test) {
					a = foo;
				} else{
					a = format(
						value,
					);
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				if (
					test(
						value,
					)
				) {
					a = foo;
				} else{
					a = bar;
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				if (test) {
					a = foo; b = 1;
				} else{
					a = bar;
				}
			`,
			options: onlySingleLineOptions,
		},
	],
	invalid: [
		{
			code: outdent`
				if (test) {
					a = foo;
				} else {
					a = bar;
				}
			`,
			output: 'a = test ? foo : bar;',
			options: onlySingleLineOptions,
			errors,
		},
		// Parentheses are not considered part of `Node`
		{
			code: outdent`
				if (
					(
						test
					)
				) {
					a = foo;
				} else {
					a = bar;
				}
			`,
			output: outdent`
				a = (
						test
					) ? foo : bar;
			`,
			options: onlySingleLineOptions,
			errors,
		},
		{
			code: outdent`
				if (test) {
					(
						a = foo
					);
				} else {
					a = bar;
				}
			`,
			output: 'a = test ? foo : bar;',
			options: onlySingleLineOptions,
			errors,
		},
		// Semicolon of `ExpressionStatement` is not considered part of `Node`
		{
			code: outdent`
				if (test) {
					a = foo
					;
				} else {
					a = bar;
				}
			`,
			output: 'a = test ? foo : bar;',
			options: onlySingleLineOptions,
			errors,
		},
		// `EmptyStatement`s are excluded
		{
			code: outdent`
				if (test) {
					;;;;;;
					a = foo;
					;;;;;;
				} else {
					a = bar;
				}
			`,
			output: 'a = test ? foo : bar;',
			options: onlySingleLineOptions,
			errors,
		},
	],
});

test({
	valid: [
		// No `consequent` / `alternate`
		'if (a) {b}',
		'if (a) {} else {b}',
		'if (a) {} else {}',

		// Calls are not mergeable
		outdent`
			if (test) {
				a();
			} else {
				b();
			}
		`,

		// Else-if chain
		outdent`
			function foo(){
				if (a) {
					return 1;
				} else if (b) {
					return 2;
				} else if (c) {
					return 3;
				} else {
					return 4;
				}
			}
		`,
		outdent`
			function *foo(bool) {
				if (!bool) {
					yield call(
						setOnTop,
						false,
					);
				} else {
					yield call(
						setOnTop,
						true,
						'normal',
					); // Keep this comment.
				}
			}
		`,
		'if (test) {foo = /* comment */1;} else {foo = 2;}',
	],
	invalid: [
		// Empty block should not matter
		{
			code: outdent`
				function unicorn() {
					// There is an empty block inside consequent
					if (test) {
						;
						return a;
					} else {
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					// There is an empty block inside consequent
					return test ? a : b;
				}
			`,
			errors,
		},
		// `ExpressionStatement` or `BlockStatement` should not matter
		{
			code: outdent`
				function unicorn() {
					if (test) {
						foo = a
					} else foo = b;
				}
			`,
			output: outdent`
				function unicorn() {
					foo = test ? a : b;
				}
			`,
			errors,
		},
		// No `ExpressionStatement` or `BlockStatement` should not matter
		{
			code: outdent`
				function unicorn() {
					if (test) return a;
					else return b;
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? a : b;
				}
			`,
			errors,
		},

		// Precedence
		{
			code: outdent`
				if (a = b) {
					foo = 1;
				} else foo = 2;
			`,
			output: 'foo = (a = b) ? 1 : 2;',
			errors,
		},
		{
			code: outdent`
				function* unicorn() {
					if (yield a) {
						foo = 1;
					} else foo = 2;
				}
			`,
			output: outdent`
				function* unicorn() {
					foo = (yield a) ? 1 : 2;
				}
			`,
			errors,
		},
		{
			code: outdent`
				function* unicorn() {
					if (yield* a) {
						foo = 1;
					} else foo = 2;
				}
			`,
			output: outdent`
				function* unicorn() {
					foo = (yield* a) ? 1 : 2;
				}
			`,
			errors,
		},

		// Nested
		{
			code: outdent`
				function foo(){
					if (a) {
						return 1;
					} else {
						if (b) {
							return 2;
						} else {
							return 3;
						}
					}
				}
			`,
			output: outdent`
				function foo(){
					if (a) {
						return 1;
					} else {
						return b ? 2 : 3;
					}
				}
			`,
			errors,
		},
		{
			code: outdent`
				function foo(){
					if (a) {
						if (b) {
							return 1;
						} else {
							return 2;
						}
					} else {
						return 3;
					}
				}
			`,
			output: outdent`
				function foo(){
					if (a) {
						return b ? 1 : 2;
					} else {
						return 3;
					}
				}
			`,
			errors,
		},
	],
});

// Variable declaration with no else clause
test({
	valid: [
		'let x = a; if (/* explanation */ test) { x = b; }',
		// `var` instead of `let`
		outdent`
			var x = a;
			if (test) {
				x = b;
			}
		`,
		// `const` declaration
		outdent`
			const x = a;
			if (test) {
				x = b;
			}
		`,
		// No initializer
		outdent`
			let x;
			if (test) {
				x = b;
			}
		`,
		// Init has side effects (function call)
		outdent`
			let x = foo();
			if (test) {
				x = b;
			}
		`,
		// Init has side effects (new expression)
		outdent`
			let x = new Foo();
			if (test) {
				x = b;
			}
		`,
		// Variable referenced in test
		outdent`
			let x = a;
			if (x) {
				x = b;
			}
		`,
		// Variable referenced in assignment right side
		outdent`
			let x = a;
			if (test) {
				x = x + 1;
			}
		`,
		// Non-adjacent statements
		outdent`
			let x = a;
			doSomething();
			if (test) {
				x = b;
			}
		`,
		// Multiple declarators
		outdent`
			let x = a, y = b;
			if (test) {
				x = c;
			}
		`,
		// Compound operator
		outdent`
			let x = a;
			if (test) {
				x += b;
			}
		`,
		// Destructuring id
		outdent`
			let {a} = obj;
			if (test) {
				a = b;
			}
		`,
		// Init is ternary
		outdent`
			let x = condition ? a : b;
			if (test) {
				x = c;
			}
		`,
		// Test is ternary
		outdent`
			let x = a;
			if (condition ? b : c) {
				x = d;
			}
		`,
		// Assignment right is ternary
		outdent`
			let x = a;
			if (test) {
				x = b ? c : d;
			}
		`,
		// Multiple statements in if body
		outdent`
			let x = a;
			if (test) {
				x = b;
				doSomething();
			}
		`,
		// Previous sibling is not a declaration
		outdent`
			doSomething();
			if (test) {
				x = b;
			}
		`,
		// Left side is not an Identifier
		outdent`
			let x = a;
			if (test) {
				obj.prop = b;
			}
		`,
		// Different variable name
		outdent`
			let x = a;
			if (test) {
				y = b;
			}
		`,
		// `if` with `else` clause (only no-alternate is handled)
		outdent`
			let x = a;
			if (test) {
				x = b;
			} else {
				doSomething();
			}
		`,
		// `if` with `else if`
		outdent`
			let x = a;
			if (test) {
				x = b;
			} else if (other) {
				x = c;
			}
		`,
		// Variable referenced in nested call in test
		outdent`
			let x = a;
			if (fn(x)) {
				x = b;
			}
		`,
		// `only-single-line` with multi-line init
		{
			code: outdent`
				let x = first
					?? second;
				if (test) {
					x = b;
				}
			`,
			options: onlySingleLineOptions,
		},
		// `only-single-line` with multi-line test
		{
			code: outdent`
				let x = a;
				if (test(
					value,
				)) {
					x = b;
				}
			`,
			options: onlySingleLineOptions,
		},
		// `only-single-line` with multi-line assignment value
		{
			code: outdent`
				let x = a;
				if (test) {
					x = format(
						value,
					);
				}
			`,
			options: onlySingleLineOptions,
		},
		// Comments in if body (preserved without reporting)
		outdent`
			let x = a;
			if (test) {
				x = /* comment */ b;
			}
		`,
		// Comments between declaration and if (preserved without reporting)
		outdent`
			let x = a;
			// comment
			if (test) {
				x = b;
			}
		`,
		// Comments inside declaration (preserved without reporting)
		outdent`
			let x = /* comment */ a;
			if (test) {
				x = b;
			}
		`,
		// Trailing comment on declaration (preserved without reporting)
		outdent`
			let x = a; // default value
			if (test) {
				x = b;
			}
		`,
		// Block comment between declaration and if (preserved without reporting)
		outdent`
			let x = a;
			/* block comment */
			if (test) {
				x = b;
			}
		`,
	],
	invalid: [
		{
			code: 'let result = other; if (item => normalize(item)) { result = value; }',
			errors: errorsWithSuggestion('const result = (item => normalize(item)) ? value : other;'),
		},
		// Basic case
		{
			code: outdent`
				let items = defaultData;
				if (data.length) {
					items = data;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const items = data.length ? data : defaultData;
			`),
		},
		// Keep the `let` plus `if` fallback when the following return is not mergeable
		{
			code: outdent`
				function foo() {
					let x = a;
					if (test) {
						x = b;
					}
					return c;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				function foo() {
					const x = test ? b : a;
					return c;
				}
			`),
		},
		// Without braces
		{
			code: outdent`
				let x = a;
				if (test) x = b;
			`,
			errors: errorsWithSuggestion('const x = test ? b : a;'),
		},
		// Keep `let` when variable has later writes
		{
			code: outdent`
				function foo() {
					let x = a;
					if (test) {
						x = b;
					}
					x = c;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				function foo() {
					let x = test ? b : a;
					x = c;
				}
			`),
		},
		// Top-level (Program body)
		{
			code: outdent`
				let x = a;
				if (test) {
					x = b;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : a;
			`),
		},
		// `only-single-line` with all single-line expressions
		{
			code: outdent`
				let x = a;
				if (test) {
					x = b;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : a;
			`),
			options: onlySingleLineOptions,
		},
		// Test has side effects
		{
			code: outdent`
				let x = y;
				if (y = 0) {
					x = 1;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = (y = 0) ? 1 : y;
			`),
		},
		// Init may be observable
		{
			code: outdent`
				let x = object.value;
				if (test) {
					x = b;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : object.value;
			`),
		},
		// Test may be observable
		{
			code: outdent`
				let x = y;
				if (object.flag) {
					x = 1;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = object.flag ? 1 : y;
			`),
		},
		// Parenthesized init value
		{
			code: outdent`
				let x = (a);
				if (test) {
					x = b;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : (a);
			`),
		},
		// Assignment value needs parentheses (await)
		{
			code: outdent`
				async function foo() {
					let x = a;
					if (test) {
						x = await b;
					}
				}
			`,
			errors: errorsWithSuggestion(outdent`
				async function foo() {
					const x = test ? (await b) : a;
				}
			`),
		},
		// Empty statements in if body
		{
			code: outdent`
				let x = a;
				if (test) {
					;;;
					x = b;
					;;;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : a;
			`),
		},
		// Assignment right side has side effects (still flags, only init is checked)
		{
			code: outdent`
				let x = a;
				if (test) {
					x = foo();
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? foo() : a;
			`),
		},
		// Inside a block scope
		{
			code: outdent`
				{
					let x = a;
					if (test) {
						x = b;
					}
				}
			`,
			errors: errorsWithSuggestion(outdent`
				{
					const x = test ? b : a;
				}
			`),
		},
		// Semicolonless suggestion adds `;` when next token is `(`
		{
			code: outdent`
				let x = a
				if (test) {
					x = b
				}
				(foo)()
			`,
			errors: errorsWithSuggestion(outdent`
				const x = test ? b : a;
				(foo)()
			`),
		},
		// TypeScript type annotation preserved
		{
			code: outdent`
				let x: string = a;
				if (test) {
					x = b;
				}
			`,
			errors: errorsWithSuggestion(outdent`
				const x: string = test ? b : a;
			`),
			languageOptions: {parser: parsers.typescript},
		},
	],
});
