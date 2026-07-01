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
		{
			code: outdent`
				function foo() {
					if (condition) {
						;(event.target as HTMLInputElement).blur();
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
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
				if (! /* Keep this comment with the condition. */ condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (!/* Keep this comment with the condition. */ condition) {
					const value = getValue();
					doSomething(value);
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
					let value = getValue();
					value = updateValue(value);
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					var value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const {value} = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const value = getValue();
					const result = transform(value);
					doSomething(result);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					const [first, second] = getValues();
					let total = first + second;
					doSomething(total);
				}
			}
		`,
		outdent`
			function foo(object) {
				if (object.value) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function value() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			const foo = function value() {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			};
		`,
		outdent`
			function foo(items) {
				if (items.some(value => value.enabled)) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						const element = <div />;
						doSomething(element);
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
			function foo(event) {
				if (
					event.key === 'Escape'
					&& event.isTrusted
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (
					// Keep this comment with the condition.
					event.altKey
					&& event.isTrusted
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey /* Keep this comment with the condition. */ && event.isTrusted) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey /* Keep this trailing condition comment. */) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(event) {
				if (event.altKey // Keep this trailing condition comment.
				) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		{
			code: outdent`
				export default mem((selector: string | ((clickedItem: HTMLElement) => string)): EventHandler => event => {
					if (event.altKey && event.isTrusted) {
						const clickedItem = event.delegateTarget;

						// \`parentElement\` is the anchor because \`clickedItem\` might be hidden/replaced after the click
						const resetScroll = preserveScroll(clickedItem.parentElement!);
						clickAllExcept(typeof selector === 'string' ? selector : selector(clickedItem), clickedItem);
						resetScroll();
					}
				});
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		outdent`
			function foo() {
				if (value) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (getCondition(() => value)) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (getCondition(function() {
					return value;
				})) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(object) {
				if (object[value]) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo(value) {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo({value}) {
				if (condition) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			const foo = function value(parameter) {
				if (condition) {
					const parameter = getValue();
					doSomething(parameter);
				}
			};
		`,
		outdent`
			function foo() {
				if (eval('typeof value === "undefined"')) {
					const value = getValue();
					doSomething(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (eval('condition')) {
					doSomething();
					doSomethingElse();
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
					class Value {}
					doSomething(Value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						type Value = string;
						doSomething<Value>();
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
					if (condition) {
						interface Value {
							key: string;
						}
						doSomething<Value>();
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
					if (condition) {
						enum Value {
							Key,
						}
						doSomething(Value.Key);
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
					if (condition) {
						namespace Value {
							export const key = 'value';
						}
						doSomething(Value.key);
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
					if (condition) {
						module Value {
							export const key = 'value';
						}
						doSomething(Value.key);
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
					using resource = getResource();
					doSomething(resource);
				}
			}
		`,
		outdent`
			async function foo() {
				if (condition) {
					await using resource = getResource();
					doSomething(resource);
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
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething(); // Trailing comment.
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething(
							value,
						);
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
});
