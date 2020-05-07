import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-ternary';

const messageId = 'prefer-ternary';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
});

const errors = [{messageId}];

// ReturnStatement
ruleTester.run('prefer-ternary', rule, {
	valid: [
		// When ReturnStatement has no argument, should fix to `test ? undefined : …`, not handled
		outdent`
			function unicorn() {
				if(test){
					return;
				} else{
					return b;
				}
			}
		`,
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
		`
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
			errors
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
			errors
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
			errors
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
			errors
		}
	]
});

// YieldExpression
ruleTester.run('prefer-ternary', rule, {
	valid: [
		// When YieldExpression has no argument, should fix to `test ? undefined : …`, not handled
		outdent`
			function* unicorn() {
				if(test){
					yield;
				} else{
					yield b;
				}
			}
		`,
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
		`
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
			errors
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
			errors
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
			errors
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
			errors
		}
	]
});

// AwaitExpression
ruleTester.run('prefer-ternary', rule, {
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
		`
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
			errors
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
			errors
		}
	]
});

// ThrowStatement
ruleTester.run('prefer-ternary', rule, {
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
				if(test){
					throw a ? b : c;
				} else{
					throw b;
				}
			}
		`,
		// Alternate is Ternary
		outdent`
			function unicorn() {
				if(test){
					throw a;
				} else{
					throw a ? b : c;
				}
			}
		`
	],
	invalid: [
		{
			code: outdent`
				function unicorn() {
					if(test){
						throw new Error('a');
					} else{
						throw new TypeError('a');
					}
				}
			`,
			output: outdent`
				function unicorn() {
					throw test ? new Error('a') : new TypeError('a');
				}
			`,
			errors
		},
		{
			code: outdent`
				function unicorn() {
					if(test){
						throw a;
					} else{
						throw b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					throw test ? a : b;
				}
			`,
			errors
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						throw await a;
					} else{
						throw b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					throw test ? (await a) : b;
				}
			`,
			errors
		},
		{
			code: outdent`
				async function unicorn() {
					if(test){
						throw await a;
					} else{
						throw await b;
					}
				}
			`,
			output: outdent`
				async function unicorn() {
					throw await (test ? a : b);
				}
			`,
			errors
		},
		// Crazy nested
		{
			code: outdent`
				async function* unicorn() {
					if(test){
						throw yield await (foo = a);
					} else{
						throw yield await (foo = b);
					}
				}
			`,
			output: outdent`
				async function* unicorn() {
					throw yield (await (foo = test ? a : b));
				}
			`,
			errors
		}
	]
});

// AssignmentExpression
ruleTester.run('prefer-ternary', rule, {
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
		// Same `left`, but not handled
		outdent`
			function unicorn() {
				if(test){
					foo.bar = a;
				} else{
					foo.bar = b;
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
		`
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
			errors
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
			errors
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
			errors
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
			errors
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
			errors
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
			errors
		}
	]
});

ruleTester.run('prefer-ternary', rule, {
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
		`
	],
	invalid: [
		// Empty block should not matters
		{
			code: outdent`
				function unicorn() {
					if (test) {
						; // Empty block
						return a;
					} else {
						return b;
					}
				}
			`,
			output: outdent`
				function unicorn() {
					return test ? a : b;
				}
			`,
			errors
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
			errors
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
			errors
		},
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
			errors
		},

		// Precedence
		{
			code: outdent`
				if (a = b) {
					foo = 1;
				} else foo = 2;
			`,
			output: 'foo = (a = b) ? 1 : 2;',
			errors
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
			errors
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
			errors
		},

		// Nested
		// [TBD]: this need discuss
		{
			code: outdent`
				function foo(){
					if (a) {
						return 1;
					} else if (b) {
						return 2;
					} else {
						return 3;
					}
				}
			`,
			output: outdent`
				function foo(){
					if (a) {
						return 1;
					} else return b ? 2 : 3;
				}
			`,
			errors
		},
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
			errors
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
			errors
		}
	]
});

babelRuleTester.run('prefer-ternary', rule, {
	valid: [],
	invalid: [
		// https://github.com/facebook/react/blob/7a1691cdff209249b49a4472ba87b542980a5f71/packages/react-dom/src/client/DOMPropertyOperations.js#L183
		{
			code: outdent`
				if (enableTrustedTypesIntegration) {
					attributeValue = (value: any);
				} else {
					attributeValue = '' + (value: any);
				}
			`,
			output: outdent`
				attributeValue = enableTrustedTypesIntegration ? (value: any) : '' + (value: any);
			`,
			errors
		}
	]
});
