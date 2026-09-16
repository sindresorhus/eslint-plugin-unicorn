import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta);

testRule({
	valid: [],
	invalid: [
		{
			code: 'function foo(bar) { const result = 1; if (bar) { console.log(result); } }',
			output: 'function foo(bar) { if (bar) { const result = 1; console.log(result); } }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'result'}}],
		},
		{
			code: 'const value = 1; if (condition) { consume(/* keep */ value); }',
			output: 'if (condition) { const value = 1; consume(/* keep */ value); }',
			errors: [{messageId: 'prefer-smaller-scope', data: {name: 'value'}}],
		},
	],
});

testRule.snapshot({
	valid: [
		'const value = 1; if (condition) { consume(); }',
		'const value = 1; if (value) { consume(value); }',
		'const value = 1; if (condition) { consume(value); } consume(value);',
		'const value = 1; if (condition) { consume(value); } else { consume(value); }',
		'const value = 1; consume(); if (condition) { consume(value); }',
		'const value = 1; if (condition) consume(value);',
		'const value = 1; if (condition) {} else if (other) { consume(value); }',
		'const value = 1; while (condition) { consume(value); }',
		'const value = 1; if (condition) { function nested() { consume(value); } nested(); }',
		'const value = 1; if (condition) { consume(() => value); }',
		'const value = 1; if (condition) { class Nested { field = value; } consume(Nested); }',
		'const value = 1; if (condition) { eval("value"); consume(value); }',
		'const value = 1; if (condition) { consume(value); } eval("value");',
		'const value = 1, other = 2; if (condition) { consume(value, other); }',
		'const {value} = object; if (condition) { consume(value); }',
		'var value = 1; if (condition) { consume(value); }',
		'using value = resource; if (condition) { consume(value); }',
		...[
			'getValue()',
			'other',
			'/pattern/',
			'[1]',
			'{foo: 1}',
			'`value ${other}`', // eslint-disable-line no-template-curly-in-string
			'tag`value`',
			'-1',
			'await getValue()',
		].map(initializer => `async function foo() { const value = ${initializer}; if (condition) { consume(value); } }`),
		...[
			'1 as number',
			'1 satisfies number',
		].map(initializer => ({
			code: `const value = ${initializer}; if (condition) { consume(value); }`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'const value = 1; if (condition) { consume(value); } type Value = typeof value;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = typeof value; const value = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare const value = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'declare let value; if (condition) { value = getValue(); consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		...[
			'eval!("consume(value)");',
			'(eval as any)("consume(value)");',
		].map(evalCall => ({
			code: `const value = 1; if (condition) { consume(value); } ${evalCall}`,
			languageOptions: {parser: parsers.typescript},
		})),
		{
			code: 'function foo(object) { const value = 1; if (condition) { with (object) { consume(value); } } }',
			languageOptions: {sourceType: 'script'},
		},
	],
	invalid: [
		...['1', '1n', 'true', 'false', 'null', '"value"', '`value`'].map(initializer => `const value = ${initializer}; if (condition) { consume(value); }`),
		'let value = 1; if (condition) { value++; consume(value); }',
		'const value = 1; if (condition) { consume(); } else { consume(value); }',
		'const value = 1; if (condition) { if (other) { consume(value); } }',
		'const value = (1); if (condition) { consume(value); }',
		{
			code: 'const value = 1; if (condition) { returnValue = <Component value={value} />; }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'const value = 1; if (condition) { consume?.(value); }',
		'const value = 1\nif (condition) {\n\t[value].map(consume)\n}',
		'const value = `first\nsecond`; if (condition) { consume(value); }',
		'const value = 1; if (condition) { "use strict"; consume(value); }',
		'/* declaration */ const value = 1; if (condition) { consume(value); }',
		'const value = /* initializer */ 1; if (condition) { consume(value); }',
		'const value = 1; /* condition */ if (condition) { consume(value); }',
		'const value = 1; if (condition) { /* first statement */ consume(value); }',
		{
			code: 'const value: number = 1; if (condition) { consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type Value = number; const value: Value = 1; if (condition) { type Value = string; consume(value); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value = 1; if (condition) { type Value = typeof value; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test('literal declarations work with no-declarations-before-early-exit', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-smaller-scope': 'error',
			'unicorn/no-declarations-before-early-exit': 'error',
		},
	};
	const code = outdent`
		function foo(bar, condition) {
			const result = 1;
			if (!bar) {
				return;
			}
			if (condition) {
				console.log(result);
			}
		}
	`;
	const result = linter.verifyAndFix(code, config);
	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(result.output, outdent`
		function foo(bar, condition) {
			if (!bar) {
				return;
			}
			if (condition) {
				const result = 1;
				console.log(result);
			}
		}
	`);
});

testRule.snapshot({
	valid: [
		outdent`
			function foo() {
				while (condition) {
					const value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue(value);
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					console.log(value);
					value = getValue();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
				}
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
				if (otherCondition) {
					value = getOtherValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				const value = getValue();
				if (condition) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				var value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value, otherValue;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value += getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					({value} = getObject());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					[value] = getArray();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value++;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					++value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (value = getValue()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (value = getValue(); condition; update()) {
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true:
						value = getValue();
						console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					value = getValue();
					console.log(value);
				}
				let value;
			}
		`,
		outdent`
			let value;
			function foo() {
				value = getValue();
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					function bar() {
						value = getValue();
						console.log(value);
					}
					bar();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					class Bar {
						method() {
							value = getValue();
							console.log(value);
						}
					}
					console.log(Bar);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					function bar() {
						console.log(value);
					}
					bar();
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					class Bar {
						method() {
							console.log(value);
						}
					}
					console.log(Bar);
				}
			}
		`,
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					eval('value = getOtherValue()');
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
				eval('console.log(value)');
			}
		`,
		outdent`
			function foo() {
				let value;
				function bar() {
					eval('console.log(value)');
				}
				if (condition) {
					value = getValue();
					console.log(value);
				}
				bar();
			}
		`,
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						call();
					}
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
		{
			code: outdent`
				function foo(object) {
					let value;
					with (object) {
						eval('console.log(value)');
					}
					if (condition) {
						value = getValue();
						console.log(value);
					}
				}
			`,
			languageOptions: {
				sourceType: 'script',
			},
		},
	],
	invalid: [
		outdent`
			let value;
			{
				value = getValue();
				console.log(value);
			}
		`,
		outdent`
			function foo() {
				let value;
				while (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				{
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				for (const item of items) {
					value = item.value;
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				switch (condition) {
					case true: {
						value = getValue();
						console.log(value);
						break;
					}
				}
			}
		`,
		outdent`
			function foo() {
				// Important setup.
				let value;
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				// Keep this close to the assignment.
				if (condition) {
					value = getValue();
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					value = getValue(); // Keep this comment.
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = getValue());
					console.log(value);
				}
			}
		`,
		outdent`
			function foo() {
				let value;
				if (condition) {
					(value = (foo, bar));
					console.log(value);
				}
			}
		`,
		{
			code: outdent`
				function foo() {
					let value: Value;
					if (condition) {
						value = getValue();
						console.log(value);
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
					let value: Value;
					if (condition) {
						(value = getValue());
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: outdent`
				type Value = string;
				function foo() {
					let value: Value;
					if (condition) {
						value = getValue();
						type Value = number;
						console.log(value);
					}
				}
			`,
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
