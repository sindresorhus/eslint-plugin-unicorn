import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const invalidTestCase = ({code, suggestions}) => {
	if (!suggestions) {
		return {
			code,
			errors: [{
				messageId: 'preferDefaultParameters',
			}],
		};
	}

	return {
		code,
		errors: suggestions.map(suggestion => ({
			messageId: 'preferDefaultParameters',
			suggestions: [{
				messageId: 'preferDefaultParametersSuggest',
				output: suggestion,
			}],
		})),
	};
};

test({
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
		'const abc = function(foo = { bar: 123 }) { }',
		'const abc = function({ bar } = { bar: 123 }) { }',
		'const abc = function({ bar = 123 } = {}) { }',
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
			function abc(foo, bar) {
				foo = foo || 'bar';
				baz();
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
			const abc = function(foo, bar) {
				bar = foo || 'bar';
			}
		`,
		outdent`
			const abc = function(foo) {
				foo = foo || bar();
			}
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
		`,
		// The following tests check references and side effects
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				console.log(foo);
				foo = foo || 'bar';
			}
		`,
		outdent`
			function abc(foo) {
				const bar = foo || 'bar';
				console.log(foo, bar);
			}
		`,
		outdent`
			function abc(foo) {
				let bar = 123;
				bar = foo;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo) {
				bar();
				foo = foo || 123;
			}
		`,
		outdent`
			const abc = (foo) => {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			const abc = function(foo) {
				bar();
				foo = foo || 123;
			};
		`,
		outdent`
			function abc(foo) {
				sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = sideEffects() + 123;
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = !sideEffects();
				foo = foo || 123;

				function sideEffects() {
					foo = 456;
				}
			}
		`,
		outdent`
			function abc(foo) {
				const bar = function() {
					foo = 456;
				}
				foo = foo || 123;
			}
		`,
		// Last parameter is `RestElement`
		outdent`
			function abc(...foo) {
				foo = foo || 'bar';
			}
		`,
		// Last parameter is `AssignmentPattern`
		outdent`
			function abc(foo = 'bar') {
				foo = foo || 'baz';
			}
		`,
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
			`],
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
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					console.log(foo);
				}
			`],
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
			`],
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
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
				}
			`],
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
			`],
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
			`],
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
			`],
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
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					foo = foo ?? 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				function abc(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					const bar = foo || 'bar';
					console.log(bar);
				}
			`,
			suggestions: [outdent`
				const abc = function(bar = 'bar') {
					console.log(bar);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) { }
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) { }
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) { }
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) { }
				}
			`],
		}),
		// The following tests verify the correct code formatting
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\'; }',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'function abc(foo) { foo = foo || \'bar\';}',
			suggestions: ['function abc(foo = \'bar\') { }'],
		}),
		invalidTestCase({
			code: 'const abc = function(foo) { foo = foo || \'bar\';}',
			suggestions: ['const abc = function(foo = \'bar\') { }'],
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
			`],
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
			`],
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
			`],
		}),
		invalidTestCase({
			code: outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`,
			suggestions: [outdent`
				foo = {
					abc(foo = 123) {
					},
					def(foo) {
						foo = foo || 123;
					}
				};
			`, outdent`
				foo = {
					abc(foo) {
						foo = foo || 123;
					},
					def(foo = 123) {
					}
				};
			`],
		}),
		invalidTestCase({
			code: outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`,
			suggestions: [outdent`
				class Foo {
					abc(foo = 123) {
					}
					def(foo) {
						foo = foo || 123;
					}
				}
			`, outdent`
				class Foo {
					abc(foo) {
						foo = foo || 123;
					}
					def(foo = 123) {
					}
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const noSideEffects = 123;
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const noSideEffects = 123;
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				const abc = function(foo) {
					let bar = true;
					bar = false;

					foo = foo || 123;
					console.log(foo);
				}
			`,
			suggestions: [outdent`
				const abc = function(foo = 123) {
					let bar = true;
					bar = false;

					console.log(foo);
				}
			`],
		}),
		invalidTestCase({
			code: outdent`
				function abc(foo) {
					const bar = function() {};
					foo = foo || 123;
				}
			`,
			suggestions: [outdent`
				function abc(foo = 123) {
					const bar = function() {};
				}
			`],
		}),
	],
});

test.babel({
	valid: [
		outdent`
			function abc(foo, bar) {
				const { baz, ...rest } = bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				const baz = foo?.bar;
				foo = foo || 123;
			}
		`,
		outdent`
			function abc(foo, bar) {
				import('foo');
				foo = foo || 123;
			}
		`,
	],
	invalid: [],
});
