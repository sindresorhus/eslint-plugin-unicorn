import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition)
					doSomething();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}

				finish();
			}
		`,
		outdent`
			if (condition) {
				doSomething();
				doSomethingElse();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				} else {
					doOtherThing();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				} else if (otherCondition) {
					doOtherThing();
				}
			}
		`,
		'const foo = () => condition ? doSomething() : doOtherThing();',
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			options: [{maximumStatements: 2}],
		},
		{
			code: outdent`
				function foo() {
					if (condition) {}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition);
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
	invalid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			const foo = function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			const foo = () => {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			const object = {
				foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				},
			};
		`,
		outdent`
			class Foo {
				bar() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			}
		`,
		outdent`
			callback(function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			});
		`,
		outdent`
			function foo() {
				if (!condition) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (foo || bar) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (foo === bar) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (foo as boolean) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (foo!) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (<boolean>foo) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				function foo() {
					if (foo satisfies boolean) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function foo() {
				if (condition) {
					// Keep this comment.
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) /* no autofix */ {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					function getValue() {}
					doSomething(getValue);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething(\`
						value
					\`);
					doSomethingElse();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething('value\\
						value');
					doSomethingElse();
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething(<div>
							value
						</div>);
						doSomethingElse();
					}
				}
			`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				} // Trailing comment.
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
				// Following comment.
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething();
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
});
