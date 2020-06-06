import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-default-parameters';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const invalidTestCase = ({code, suggestions}) => {
	if (!suggestions) {
		return {
			code,
			output: code,
			errors: [{
				messageId: 'preferDefaultParameters'
			}]
		};
	}

	return {
		code,
		output: code,
		errors: suggestions.map(suggestion => ({
			messageId: 'preferDefaultParameters',
			suggestions: [{
				messageId: 'preferDefaultParametersSuggest',
				output: suggestion
			}]
		}))
	};
};

ruleTester.run('prefer-default-parameters', rule, {
	valid: [
		'function abc(foo = { bar: 123 }) { }',
		'function abc({ bar } = { bar: 123 }) { }',
		'function abc({ bar = 123 } = { bar }) { }',
		'function abc(foo = fooDefault) { }',
		'function abc(foo = {}) { }',
		'function abc(foo = \'bar\') { }',
		'function abc({ bar = 123 } = {}) { }',
		'const abc = (foo = \'bar\') => { };',
		'foo = foo || \'bar\';',
		'const bar = foo || \'bar\';',
		outdent`
			function abc(foo) {
				foo = foo || bar();
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || {bar};
			}
		`,
		outdent`
			function abc(foo) {
				const {bar} = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo && 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = foo || 1 && 2 || 3;
			}
		`,
		outdent`
			function abc(foo) {
				foo = !foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				foo = (foo && bar) || baz;
			}
		`,
		outdent`
			function abc(foo = 123) {
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc() {
				let foo = 123;
				const bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = (foo, bar) => {
				bar = foo || 'bar';
			};
		`,
		outdent`
			function abc(foo) {
				function def(bar) {
					foo = foo || 'bar';
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo = foo || 123;
		   	}
		`,
		outdent`
			function abc(foo) {
				bar(foo = foo || 1);
				baz(foo);
			}
		`
	],
	invalid: [
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || true;
				}
			`,
			suggestions: [outdent`
				function abc(foo = true) {
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo, bar) {
					foo = foo || 'bar';
					baz();
				}
			`
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					let bar = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(bar) {
					foo();
					bar = bar || 123;
				}
			`,
			suggestions: [outdent`
				function abc(bar = 123) {
					foo();
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`]
		}),
		invalidTestCase({
			code: outdent`
				const abc = foo => {
					foo = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (foo = 'bar') => {
				};
			`]
		}),
		invalidTestCase({
			code: outdent`
				const abc = (bar) => {
					foo();
					bar = bar || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (bar = 'bar') => {
					foo();
				};
			`]
		}),
		invalidTestCase({
			code: outdent`
				const abc = (foo) => {
					const bar = foo || 'bar';
				};
			`,
			suggestions: [outdent`
				const abc = (bar = 'bar') => {
				};
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					bar();
					baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar();
					baz();
				}
			`]
		}),
		// The following tests verify the correct code formatting
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\'; }',
			suggestions: ['function abc(foo = \'bar\') { }']
		}),
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\';}',
			suggestions: ['function abc(foo = \'bar\') { }']
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar'; bar(); baz();
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					bar(); baz();
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`,
			suggestions: [outdent`
				function abc(foo = 'bar') {
					function def(bar) {
						bar = bar || 'foo';
					}
				}
			`, outdent`
				function abc(foo) {
					foo = foo || 'bar';
					function def(bar = 'foo') {
					}
				}
			`]
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`,
			suggestions: [outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar = 'foo') {
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
					foo = foo || 'bar';
				}
			`, outdent`
				function abc(foo) {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(bay = 'bar') {
					}
					foo = foo || 'bar';
				}
			`, outdent`
				function abc(foo = 'bar') {
					foo += 'bar';
					function def(bar) {
						bar = bar || 'foo';
					}
					function ghi(baz) {
						const bay = baz || 'bar';
					}
				}
			`]
		})
	]
});
