import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

const messageId = 'prefer-ternary';
const errors = [{messageId}];

const onlySingleLineOptions = [{onlySingleLine: true}];
const onlyAssignmentsOptions = [{onlyAssignments: true}];

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

// `only-assignments`
test({
	valid: [
		// YieldExpression should be ignored
		{
			code: outdent`
				function* unicorn() {
					// only-assignments: YieldExpression
					if (test) {
						yield a;
					} else {
						yield b;
					}
				}
			`,
			options: onlyAssignmentsOptions,
		},
		// AwaitExpression should be ignored
		{
			code: outdent`
				async function unicorn() {
					// only-assignments: AwaitExpression
					if (test) {
						await a;
					} else {
						await b;
					}
				}
			`,
			options: onlyAssignmentsOptions,
		},
		// ThrowStatement should be ignored
		{
			code: outdent`
				function unicorn() {
					// only-assignments: ThrowStatement
					if (test) {
						throw new Error('a');
					} else {
						throw new Error('b');
					}
				}
			`,
			options: onlyAssignmentsOptions,
		},
	],
	invalid: [
		// ReturnStatement should be reported
		{
			code: outdent`
				function unicorn() {
					// only-assignments: ReturnStatement
					if (test) {
						return a;
					} else {
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					// only-assignments: ReturnStatement
					return test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// ReturnStatement with await - await stays inside each branch
		{
			code: outdent`
				async function unicorn() {
					// only-assignments: ReturnStatement with await
					if (test) {
						return await a;
					} else {
						return await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					// only-assignments: ReturnStatement with await
					return test ? (await a) : (await b);
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// AssignmentExpression should still be reported
		{
			code: outdent`
				function unicorn() {
					// only-assignments: AssignmentExpression
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					// only-assignments: AssignmentExpression
					foo = test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// AssignmentExpression with await should still be reported
		// With only-assignments, await stays inside each branch
		{
			code: outdent`
				async function unicorn() {
					// only-assignments: AssignmentExpression with await
					if (test) {
						foo = await a;
					} else {
						foo = await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					// only-assignments: AssignmentExpression with await
					foo = test ? (await a) : (await b);
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// Combine with preceding uninitialized variable declaration
		{
			code: outdent`
				function unicorn() {
					let foo;
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					let foo = test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// Combine with var declaration
		{
			code: outdent`
				function unicorn() {
					var foo;
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					var foo = test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// Combine with declaration and await
		{
			code: outdent`
				async function unicorn() {
					let foo;
					if (test) {
						foo = await a;
					} else {
						foo = await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					let foo = test ? (await a) : (await b);
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// TDZ: variable referenced in the if-condition should not merge with declaration
		{
			code: outdent`
				function unicorn() {
					let foo;
					if (foo) {
						foo = 1;
					} else {
						foo = 2;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					let foo;
					foo = foo ? 1 : 2;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// Comments between declaration and if should not be dropped
		{
			code: outdent`
				function unicorn() {
					let foo;
					// keep me
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					let foo;
					// keep me
					foo = test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// Block comment between declaration and if should not be dropped
		{
			code: outdent`
				function unicorn() {
					let foo;
					/* keep me */
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					let foo;
					/* keep me */
					foo = test ? a : b;
				}
			`,
			options: onlyAssignmentsOptions,
			errors,
		},
		// TypeScript annotation should be preserved when merging with declaration
		{
			code: outdent`
				function unicorn() {
					let foo: number;
					if (test) {
						foo = 1;
					} else {
						foo = 2;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					let foo: number = test ? 1 : 2;
				}
			`,
			options: onlyAssignmentsOptions,
			languageOptions: {parser: parsers.typescript},
			errors,
		},
	],
});

// Combined `only-single-line` and `only-assignments`
test({
	valid: [
		// Multi-line assignment should be ignored
		{
			code: outdent`
				function unicorn() {
					// combined options: multi-line assignment
					if (test) {
						foo = {
							a: 1
						};
					} else {
						foo = b;
					}
				}
			`,
			options: [{onlySingleLine: true, onlyAssignments: true}],
		},
		// Multi-line return should be ignored
		{
			code: outdent`
				function unicorn() {
					// combined options: multi-line return
					if (test) {
						return {
							a: 1
						};
					} else {
						return b;
					}
				}
			`,
			options: [{onlySingleLine: true, onlyAssignments: true}],
		},
	],
	invalid: [
		// Single-line assignment should be reported
		{
			code: outdent`
				function unicorn() {
					// combined options: single-line assignment
					if (test) {
						foo = a;
					} else {
						foo = b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					// combined options: single-line assignment
					foo = test ? a : b;
				}
			`,
			options: [{onlySingleLine: true, onlyAssignments: true}],
			errors,
		},
		// Single-line return should be reported
		{
			code: outdent`
				function unicorn() {
					// combined options: single-line return
					if (test) {
						return a;
					} else {
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					// combined options: single-line return
					return test ? a : b;
				}
			`,
			options: [{onlySingleLine: true, onlyAssignments: true}],
			errors,
		},
	],
});
