import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const messageId = 'prefer-ternary';
const errors = [{messageId}];

const onlySingleLineOptions = ['only-single-line'];

// ReturnStatement
test({
	valid: [
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
	],
	invalid: [
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
					return await (test ? a : b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						return;
					} else{
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? undefined : b;
				}
			`,
			errors,
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						return;
					} else{
						return;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? undefined : undefined;
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						return;
					} else{
						return await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					return test ? undefined : (await b);
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
					return yield (await (foo = test ? a : b));
				}
			`,
			errors,
		},
	],
});

// YieldExpression
test({
	valid: [
		// Different `delegate`
		outdent`
			function* unicorn() {
				if(test){
					yield* a;
				} else{
					yield b;
				}
			}
		`,
		// Test is Ternary
		outdent`
			function* unicorn() {
				if(a ? b : c){
					yield a;
				} else{
					yield b;
				}
			}
		`,
		// Consequent is Ternary
		outdent`
			function* unicorn() {
				if(test){
					yield a ? b : c;
				} else{
					yield b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			function* unicorn() {
				if(test){
					yield a;
				} else{
					yield a ? b : c;
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				function* unicorn() {
					if(test){
						yield a;
					} else{
						yield b;
					}
				}
			`,
			output: outdent`
				function* unicorn() {
					yield (test ? a : b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				function* unicorn() {
					if(test){
						yield;
					} else{
						yield b;
					}
				}
			`,
			output: outdent`
				function* unicorn() {
					yield (test ? undefined : b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				function* unicorn() {
					if(test){
						yield;
					} else{
						yield;
					}
				}
			`,
			output: outdent`
				function* unicorn() {
					yield (test ? undefined : undefined);
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						yield;
					} else{
						yield await b;
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					yield (test ? undefined : (await b));
				}
			`,
			errors,
		},
		{
			code: outdent`
				function* unicorn() {
					if(test){
						yield* a;
					} else{
						yield* b;
					}
				}
			`,
			output: outdent`
				function* unicorn() {
					yield* (test ? a : b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						yield await a;
					} else{
						yield b;
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					yield (test ? (await a) : b);
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						yield await a;
					} else{
						yield await b;
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					yield (await (test ? a : b));
				}
			`,
			errors,
		},
	],
});

// AwaitExpression
test({
	valid: [
		// Test is Ternary
		outdent`
			async function unicorn() {
				if(a ? b : c){
					await a;
				} else{
					await b;
				}
			}
		`,
		// Consequent is Ternary
		outdent`
			async function unicorn() {
				if(test){
					await a ? b : c;
				} else{
					await b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			async function unicorn() {
				if(test){
					await a;
				} else{
					await a ? b : c;
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				async function unicorn() {
					if(test){
						await doSomething1();
					} else{
						await doSomething2();
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					await (test ? doSomething1() : doSomething2());
				}
			`,
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						await a;
					} else{
						await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					await (test ? a : b);
				}
			`,
			errors,
		},
	],
});

// ThrowStatement
test({
	valid: [
		// Test is Ternary
		outdent`
			function unicorn() {
				if(a ? b : c){
					throw a;
				} else{
					throw b;
				}
			}
		`,
		// Consequent is Ternary
		outdent`
			function unicorn() {
				if (test) {
					throw a ? b : c;
				} else {
					throw b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			function unicorn() {
				if (test) {
					throw a;
				} else {
					throw a ? b : c;
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				function unicorn() {
					if (test) {
						throw new Error('a');
					} else{
						throw new TypeError('a');
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error = test ? new Error('a') : new TypeError('a');
					throw error;
				}
			`,
			errors,
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
			output: outdent`
				function unicorn() {
					const error = test ? a : b;
					throw error;
				}
			`,
			errors,
		},
		// Indention
		{
			code: outdent`
				function unicorn() {
					/* comment cause wrong indention */ if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					/* comment cause wrong indention */ const error = test ? a : b;
				 throw error;
				}
			`,
			errors,
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
			output: outdent`
				function unicorn() {
														const error = test ? a : b;
														throw error;
				}
			`,
			errors,
		},
		// Space
		{
			code: outdent`
				function unicorn() {
														if (test) {
															throw new Error('a');
														} else {
															throw new TypeError('a');
														}
				}
			`.replaceAll('\t', '  '),
			output: outdent`
				function unicorn() {
														const error = test ? new Error('a') : new TypeError('a');
														throw error;
				}
			`.replaceAll('\t', '  '),
			errors,
		},
		{
			code: outdent`
				async function unicorn() {
					if (test) {
						throw await a;
					} else {
						throw b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					const error = test ? (await a) : b;
					throw error;
				}
			`,
			errors,
		},
		// `ThrowStatement` don't check nested
		{
			code: outdent`
				async function unicorn() {
					if (test) {
						throw await a;
					} else {
						throw await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					const error = test ? (await a) : (await b);
					throw error;
				}
			`,
			errors,
		},
		// `error` is used
		{
			code: outdent`
				function unicorn() {
					const error = new Error();
					if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error = new Error();
					const error_ = test ? a : b;
					throw error_;
				}
			`,
			errors,
		},
		// Child scope
		{
			code: outdent`
				function unicorn() {
					if (test) {
						throw a;
					} else {
						throw b;
					}

					try {} catch(error) {
						const error_ = new TypeError(error);
						throw error_;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error__ = test ? a : b;
					throw error__;

					try {} catch(error) {
						const error_ = new TypeError(error);
						throw error_;
					}
				}
			`,
			errors,
		},
		// Global
		{
			code: outdent`
				function unicorn() {
					if (test) {
						throw a;
					} else {
						throw b;
					}

					function foo() {
						throw error;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error_ = test ? a : b;
					throw error_;

					function foo() {
						throw error;
					}
				}
			`,
			errors,
		},
		// Multiple
		// This will fix one by one, see next test
		{
			code: outdent`
				function unicorn() {
					if (test) {
						throw a;
					} else {
						throw b;
					}

					if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error = test ? a : b;
					throw error;

					if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			errors: [...errors, ...errors],
		},
		// This `code` is `output` from previous test
		{
			code: outdent`
				function unicorn() {
					const error = test ? a : b;
					throw error;

					if (test) {
						throw a;
					} else {
						throw b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					const error = test ? a : b;
					throw error;

					const error_ = test ? a : b;
					throw error_;
				}
			`,
			errors,
		},
		// Multiple nested
		// This will fix one by one, see next test
		{
			code: outdent`
				function outer() {
					if (test) {
						throw a;
					} else {
						throw b;
					}

					function inner() {
						if (test) {
							throw a;
						} else {
							throw b;
						}
					}
				}
			`,
			output: outdent`
				function outer() {
					const error = test ? a : b;
					throw error;

					function inner() {
						if (test) {
							throw a;
						} else {
							throw b;
						}
					}
				}
			`,
			errors: [...errors, ...errors],
		},
		// This `code` is `output` from previous test
		{
			code: outdent`
				function outer() {
					const error = test ? a : b;
					throw error;

					function inner() {
						if (test) {
							throw a;
						} else {
							throw b;
						}
					}
				}
			`,
			output: outdent`
				function outer() {
					const error = test ? a : b;
					throw error;

					function inner() {
						const error_ = test ? a : b;
						throw error_;
					}
				}
			`,
			errors,
		},
		// Need `{}`
		{
			code: outdent`
				while (foo) if (test) {throw a} else {throw b}
			`,
			output: outdent`
				while (foo) {
				 const error = test ? a : b;
				 throw error;
				}
			`,
			errors,
		},
	],
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
					foo = await (test ? a : b);
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
					foo = yield (await (test ? a : b));
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
	],
});

// `only-single-line`
test({
	valid: [
		{
			code: outdent`
				if (test) {
					a = {
						multiline: 'in consequent'
					};
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
					a = {
						multiline: 'in alternate'
					};
				}
			`,
			options: onlySingleLineOptions,
		},
		{
			code: outdent`
				if (
					test({
						multiline: 'in test'
					})
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

		// Call is not allow to merge
		outdent`
			if (test) {
				a();
			} else {
				b();
			}
		`,

		//
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
	],
	invalid: [
		// Empty block should not matters
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
		// `ExpressionStatement` or `BlockStatement` should not matters
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
		// No `ExpressionStatement` or `BlockStatement` should not matters
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
		{
			code: 'if (test) {foo = /* comment */1;} else {foo = 2;}',
			errors,
		},
	],
});
