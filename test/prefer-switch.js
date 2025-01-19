import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Less cases
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
		`,
		// Less cases
		outdent`
			if (foo === 1) {
				if (foo === 2) {}
			}
			else if (foo === 2) {}
		`,
		outdent`
			if (foo === 1 || foo === 2) {}
			else if (foo === 3 || foo === 4) {}
		`,
		// No fixable branches
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (bar === 1) {}
			else if (foo === 3) {}
			else if (foo === 4) {}
			else if (bar === 1) {}
			else if (foo === 5) {}
			else if (foo === 6) {}
		`,
		// Not considered same
		outdent`
			if (foo() === 1) {}
			else if (foo() === 2) {}
			else if (foo() === 3) {}
		`,
		// Ternary
		'foo === 1 ? 1 : foo === 2 ? 2 : foo === 3 ? 3 : 0',
		// Not comparison
		outdent`
			if (foo === 1) {}
			else if (foo !== 2) {}
			else if (foo === 3) {}
		`,
		outdent`
			if (foo === 1) {}
			else if (foo === 2 && foo === 4) {}
			else if (foo === 3) {}
		`,
		outdent`
			if (foo === 1) {}
			else if (foo === 2 || foo !== 4) {}
			else if (foo === 3) {}
		`,
	],
	invalid: [
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
		`,
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
			else {
				// default
			}
		`,
		outdent`
			if (foo === 1) (notBlock())
			else if (foo === 2) (notBlock())
			else if (foo === 3) (notBlock())
			else (notBlock())
		`,
		// First condition is not fixable
		outdent`
			if (bar = 1) {}
			else if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
		`,
		// Last condition is not fixable
		outdent`
			if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
			else if (bar === 3) {}
		`,
		// Inside if
		outdent`
			if (foo === 0) {
				if (foo === 1) {}
				else if (foo === 2) {}
				else if (foo === 3) {}
			}
		`,
		// Variable is on right side
		outdent`
			if (1 === foo) {}
			else if (foo === 2) {}
			else if (3 === foo) {}
		`,
		// Compare to constant
		outdent`
			if (true === foo) {}
			else if (bar.bar === true) {}
			else if (true === baz()) {}
		`,
		// No need add parentheses
		outdent`
			if (foo === ((0, 1))) {}
			else if (foo === (bar + 2)) {}
			else if (foo === (baz = 2)) {}
		`,
		// All conditions are same
		outdent`
			// Should use "foo" as discriminant
			if (foo === bar) {}
			else if (foo === bar) {}
			else if (foo === bar) {}

			// Should use "bar" as discriminant
			if (bar === foo) {}
			else if (bar === foo) {}
			else if (foo === bar) {}
		`,
		// Many cases
		outdent`
			if (foo === 1) {}
			${Array.from({length: 49}, (_, index) => `else if (foo === ${index + 2}) {}`).join('\n')}
			else {}
		`,
		// `OR`
		outdent`
			if (foo === 1) {}
			else if ((foo === 2 || foo === 3) || (foo === 4)) {}
			else if (foo === 5) {}
		`,
		// Indention
		outdent`
			function foo() {
				for (const a of b) {
					if (foo === 1) {
						return 1;
					} else if (foo === 2) {
						throw new Error();
					} else if (foo === 3) {
						alert(foo);
					} else {
						console.log('wow');
					}
				}
			}
		`,
		outdent`
			function foo() {
				return bar.map(foo => {
					if (foo === 1) return foo;
					else if (foo === 2) throw new Error();
					else if (foo === 3) foo++
					else console.log('wow');
				})
			}
		`,
		// Multiple
		outdent`
			if (one) {}
			else if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
			else if (two) {}
			else if (bar === 1) {}
			else if (bar === 2) {}
			else if (bar === 3) {}
			else if (foo === 1) {}
			else if (foo === 2) {}
			else if (foo === 3) {}
		`,
		// Same reference
		outdent`
			if (foo.baz === 1) {}
			else if (foo['baz'] === 2) {}
			else if (foo["ba" + 'z'] === 3) {}
		`,
		// Still fixable even there are `break`
		outdent`
			while (bar) {
				if (foo === 1) {
					for (const foo of bar) {
						break;
					}
				} else if (foo === 2) {
				} else if (foo === 3) {
				}
			}
		`,
		// Not fixable
		outdent`
			while (bar) {
				if (foo === 1) {
					break;
				} else if (foo === 2) {
				} else if (foo === 3) {
				}
			}
		`,
		outdent`
			while (bar) {
				if (foo === 1) {
				} else if (foo === 2) {
					break;
				} else if (foo === 3) {
				}
			}
		`,
		outdent`
			while (bar) {
				if (foo === 1) {
				} else if (foo === 2) {
				} else if (foo === 3) {
					if (a) {
						if (b) {
							if (c) {
								break;
							}
						}
					}
				}
			}
		`,
		outdent`
			switch (bar) {
				case 'bar':
					if (foo === 1) {
					} else if (foo === 2) {
					} else if (foo === 3) {
						break;
					}
			}
		`,
		// Should not insert `break`, #1232
		outdent`
			function unicorn() {
				if (foo === 1) return 1;
				else if (foo === 2) throw new Error("");
				else if (foo === 3) process.exit(1);
				else if (foo === 4) {}
				else if (foo === 5) ;
				else if (foo === 6) {
					return 6;
					// Already unreachable
					call();
				}
				else if (foo === 7) {
					return 7;
					// EmptyStatement after return
					;;;;;;
				}
				else if (foo === 8) {
					return 8;
					// FunctionDeclaration after return
					function afterReturn() {}
				}
				else if (foo === 9) {
					return 9;
					// FunctionExpression after return
					const afterReturn = function afterReturn() {return 9}
				}
				else if (foo === 10) {
					{{{
						return 10;
					};};};
				}
				else if (foo === 11) {
					return 11;

					{{{
						;;;
						function afterReturn() {}
						;;;
						function afterReturn2() {}
						;;;
					}}}
				}
				else if (foo === 12) {
					return twelve;
					var twelve = 12;
				}
				else return 'default';
			}
		`,
		outdent`
			function unicorn() {
				if (foo === 1) {
					if (true) {
						throw error;
					} else {
						return false;
					}
				}
				else if (foo === 2) {
					if (true) {
						throw error;
					}
				// no else, need break
				}
				else if (foo === 3) {
					if (a) {
						return a;
					} else if (b) {
						return b;
					} else if (c) {
						return c;
					} else if (d) {
						if (dd) {
							return dd;
						} else {
							return dd;
						}
					} else {
						return f;
					}
				}
				else if (foo === 4) {
					if (a) {
						return a;
					} else if (b) {
						return b;
					} else if (c) {
						return c;
					} else if (d) {
						return e;
					} // here
				// missing else deep inside, need break
				}
				else if (foo === 5) {
					if (a) {
						return a;
					} else if (b) {
						return b;
					} else if (c) {
						return c;
					} else if (d) {
						if (dd) {
							return dd;
						} else if (de) {
							return de;
						} // here
					} else {
						return f;
					}
				// missing else deep inside, need break
				}
				else if (foo === 6) {
					if (a) {
						return a;
					} else if (b) {
						return b;
					} else if (c) {
						// here
					} else if (d) {
						return e;
					} else {
						return f;
					}
				// missing one return, need break
				}
				else if (foo === 7) {
					if (a) return a;
					else if (b) {
						return b;;;;;
					} else if (c) {
						return c;
						function x() {}
					} else if (d) {
						return e;
					} else {
						return f;
					}
				}
			}
		`,
	],
});

// `options`
test.snapshot({
	valid: [
		{
			code: outdent`
				if (foo === 1) {}
				else if (foo === 2) {}
				else if (foo === 3) {}
			`,
			options: [{minimumCases: 4}],
		},
		{
			code: outdent`
				if (foo === 1) {}
				else if (foo === 2) {}
				else if (foo === 3) {}
				else {}
			`,
			options: [{minimumCases: 4}],
		},
	],
	invalid: [
		{
			code: outdent`
				if (foo === 1) {}
				else if (foo === 2) {}
			`,
			options: [{minimumCases: 2}],
		},
		{
			code: outdent`
				if (foo === 1) {}
				else if (foo === 2) {}
				else {}
			`,
			options: [{minimumCases: 2}],
		},
		{
			code: outdent`
				function foo() {
					if (foo === 1) {}
					else if (foo === 2) {}
					else if (foo === 3) {}
				}
			`,
			options: [{emptyDefaultCase: 'no-default-comment'}],
		},
		{
			code: outdent`
				function foo() {
					if (foo === 1) {}
					else if (foo === 2) {}
					else if (foo === 3) {}
				}
			`,
			options: [{emptyDefaultCase: 'do-nothing-comment'}],
		},
		{
			code: outdent`
				function foo() {
					if (foo === 1) {}
					else if (foo === 2) {}
					else if (foo === 3) {}
				}
			`,
			options: [{emptyDefaultCase: 'no-default-case'}],
		},
	],
});

test.typescript({
	valid: [],
	invalid: [
		// TypeScript allow `break` here
		{
			code: outdent`
				if (foo === 1) {}
				else if (foo === 2) {}
				else if (foo === 3) {break;}
			`,
			errors: 1,
		},
	],
});
