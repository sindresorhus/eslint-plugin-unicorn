import test from 'node:test';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: testRule} = getTester(import.meta, 'prefer-ternary');

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

for (const [name, code] of [
	['next-line disable', 'let value = a;\n// eslint-disable-next-line unicorn/prefer-ternary\nif (test) { value = b; }\nvalue = c;'],
	['next-line disable with explanation', 'let value = a;\n// eslint-disable-next-line unicorn/prefer-ternary -- Keep the branches readable.\nif (test) { value = b; }'],
	['next-line disable for all rules', 'let value = a;\n// eslint-disable-next-line\nif (test) { value = b; }'],
	['same-line disable', 'let value = a;\nif (test) { // eslint-disable-line unicorn/prefer-ternary\nvalue = b;\n}'],
	['block disable with explanation', 'let value = a;\n/* eslint-disable unicorn/prefer-ternary -- Keep branches. */\nif (test) { value = b; }\n/* eslint-enable unicorn/prefer-ternary */'],
	['if/else disable', 'if (test) { // eslint-disable-line unicorn/prefer-ternary\nvalue = a;\n} else { value = b; }'],
	['flat return disable', 'function foo() {\nif (test) { // eslint-disable-line unicorn/prefer-ternary\nreturn a;\n}\nreturn b;\n}'],
]) {
	test(`honors ${name} without reporting an unused directive`, t => {
		const linter = new Linter();
		const config = {
			plugins: {unicorn},
			rules: {'unicorn/prefer-ternary': 'error'},
			linterOptions: {reportUnusedDisableDirectives: 'error'},
		};
		t.assert.deepStrictEqual(linter.verify(code, config), []);

		const suppressedMessages = linter.getSuppressedMessages();
		t.assert.strictEqual(suppressedMessages.length, 1);
		t.assert.strictEqual(suppressedMessages[0].ruleId, 'unicorn/prefer-ternary');
		t.assert.strictEqual(suppressedMessages[0].fix, undefined);
		t.assert.strictEqual(suppressedMessages[0].suggestions, undefined);

		const result = linter.verifyAndFix(code, config);
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
	});
}

for (const [name, code] of [
	['declaration and if', '/* eslint-disable no-alert */\nalert(a);\nlet value = a;\n/* eslint-enable no-alert */\nif (test) { value = b; }'],
	['unrelated disable', 'let value = a;\n// eslint-disable-next-line no-alert\nif (test) { value = alert(b); }'],
	['if/else', '/* eslint-disable no-alert */\nalert(a);\nif (test) {\n/* eslint-enable no-alert */\nvalue = a;\n} else { value = b; }'],
	['flat returns', '/* eslint-disable no-alert */\nalert(a);\nfunction foo() {\nif (test) { return a; }\n/* eslint-enable no-alert */\nreturn b;\n}'],
	['trailing return directive', '/* eslint-disable no-alert */\nalert(a);\nfunction foo() {\nif (test) { return a; }\nreturn b; /* eslint-enable no-alert */\n}'],
]) {
	test(`reports ${name} with unrelated directives without changing comments`, t => {
		const linter = new Linter();
		const result = linter.verifyAndFix(code, {
			plugins: {unicorn},
			rules: {'unicorn/prefer-ternary': 'error', 'no-alert': 'error'},
			linterOptions: {reportUnusedDisableDirectives: 'error'},
		});

		t.assert.strictEqual(result.messages.length, 1);
		t.assert.strictEqual(result.messages[0].ruleId, 'unicorn/prefer-ternary');
		t.assert.strictEqual(result.messages[0].fix, undefined);
		t.assert.strictEqual(result.messages[0].suggestions, undefined);
		t.assert.strictEqual(result.fixed, false);
		t.assert.strictEqual(result.output, code);
	});
}

testRule({
	valid: [],
	invalid: [
		'let value = a;\n/* eslint-enable no-alert */\n// explanation\nif (test) { value = b; }',
		'if (test) {\n/* eslint-enable no-alert */\nvalue = /* explanation */ a;\n} else { value = b; }',
		'function foo() {\nif (test) { return a; }\n/* eslint-enable no-alert */\n// explanation\nreturn b;\n}',
		'function foo() {\nif (test) { return a; }\nreturn b; /* explanation */ /* eslint-enable no-alert */\n}',
	].map(code => ({code, errors: [{messageId, suggestions: []}], output: null})),
});

// Embedded ternaries should not become nested when merging expressions.
testRule({
	valid: [
		...[
			'String(a ? b : c)',
			'format?.(a ? b : c)',
			// eslint-disable-next-line no-template-curly-in-string
			'`value: ${a ? b : c}`',
			'[a, , b ? c : d]',
			'({value: a ? b : c})',
			'object[a ? b : c]',
			'await (a ? b : c)',
		].flatMap(expression => [
			`async function foo() { if (test) { return ${expression}; } return other; }`,
			`async function foo() { if (test) { return other; } else { return ${expression}; } }`,
		]),
		{
			code: 'function foo() { if (test) { return <span>{a ? b : c}</span>; } return other; }',
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'function foo() { if (Boolean(a ? b : c)) { return a; } return b; }',
		'if (Boolean(a ? b : c)) { result = a; } else { result = b; }',
		'if (test) { result = String(a ? b : c); } else { result = other; }',
		'if (test) { result = other; } else { result = [a ? b : c]; }',
		'let result = [a ? b : c]; if (test) { result = other; }',
		'let result = other; if (Boolean(a ? b : c)) { result = value; }',
		'let result = other; if (test) { result = String(a ? b : c); }',
		'let result = () => a ? b : c; if (test) { result = other; }',
		{
			code: 'function foo() { if (test) { return a; } return String(b ? c : d); }',
			options: onlySingleLineOptions,
		},
		...[
			'function foo() { if (test) { return (a ? b : c) as string; } return other; }',
			'function foo() { if (test) { return other; } return (a ? b : c)!; }',
			'function foo() { if ((a ? b : c) satisfies boolean) { return a; } return b; }',
			'if (test) { result = <string>(a ? b : c); } else { result = other; }',
			'let result = (a ? b : c) as string; if (test) { result = other; }',
			'let result = other; if (test) { result = (a ? b : c)!; }',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
	],
	invalid: [
		...[
			'a && b',
			'a || b',
			'a ?? b',
			'items.map(item => item ? a : b)',
		].map(expression => ({
			code: `function foo() { if (test) { return ${expression}; } return other; }`,
			output: `function foo() { return test ? ${expression} : other; }`,
			errors,
		})),
	],
});

test('preserves early returns after minimizing a ternary', t => {
	const code = outdent`
		async function render(value, slotValues) {
			if (typeof value === 'function') {
				return String(await value());
			}

			return String(
				value.type === 'slot' && typeof value.name === 'string'
					? await slotValues[value.name]
					: value,
			);
		}
	`;
	const linter = new Linter();
	const result = linter.verifyAndFix(code, {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-ternary': 'error',
			'unicorn/prefer-minimal-ternary': 'error',
			'unicorn/no-nested-ternary': 'error',
		},
	});

	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(result.fixed, false);
	t.assert.strictEqual(result.output, code);
});

// Preserve statement bodies and multiline containers, not ordinary line wrapping.
testRule({
	valid: [
		// Member assignment targets are not factored out of their branches.
		'if (ready) { object[`first\nsecond`] = a; } else { object[`first\nsecond`] = b; }',
		...[
			'items.map(item => { return normalize(item); })',
			'function () { return a ? b : c; }',
			'class { value = a ? b : c; }',
			'({method() { return a ? b : c; }})',
			'({get value() { return result; }})',
			'format({\nvalue: item,\n})',
			'format([\nitem,\n])',
			'format(`first\nsecond`)',
			'items.map(item => ({\nvalue: item,\n}))',
		].flatMap(expression => [
			`function foo() { if (ready) { return ${expression}; } return other; }`,
			`function foo() { if (ready) { return other; } else { return ${expression}; } }`,
			`function foo() { if (${expression}) { return a; } return b; }`,
			`if (ready) { result = ${expression}; } else { result = other; }`,
			`if (ready) { result = other; } else { result = ${expression}; }`,
			`let result = other; if (ready) { result = ${expression}; }`,
			`let result = other; if (${expression}) { result = value; }`,
		]),
		...[
			'() => { return value; }',
			'class {}',
			'({\nvalue: item,\n})',
			'[\nitem,\n]',
			'`first\nsecond`',
			'() => ({\nvalue: item,\n})',
		].map(expression => `let result = ${expression}; if (ready) { result = other; }`),
		...[
			'<span>\ntext\n</span>',
			'<>\n<span />\n</>',
			'items.map(item => <span>\n{item}\n</span>)',
		].map(expression => ({
			code: `function foo() { if (ready) { return render(${expression}); } return other; }`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		})),
		...[
			'({\nvalue: item,\n}) as Value',
			'([\nitem,\n])!',
			'({\nvalue: item,\n}) satisfies Value',
			'<Value>({\nvalue: item,\n})',
		].map(expression => ({
			code: `function foo() { if (ready) { return ${expression}; } return other; }`,
			languageOptions: {parser: parsers.typescript},
		})),
	],
	invalid: [
		...[
			'format(\nfirst,\nsecond,\n)',
			'(first\n&& second)',
			'(first\n|| second)',
			'(first\n?? second)',
			'items.map(item => normalize(item))',
			'items.map(item => ({value: item}))',
			'({value: item})',
			'[item, other]',
			'`value`',
		].flatMap(expression => [
			{
				code: `function foo() { if (ready) { return ${expression}; } return other; }`,
				output: `function foo() { return ready ? ${expression} : other; }`,
				errors,
			},
			{
				code: `if (${expression}) { result = a; } else { result = b; }`,
				output: `result = ${expression} ? a : b;`,
				errors,
			},
		]),
		{
			code: 'function foo() { if (ready) { return <span />; } return other; }',
			output: 'function foo() { return ready ? <span /> : other; }',
			errors,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		{
			code: 'let result = [item]; if (ready) { result = format(\nfirst,\nsecond\n); }',
			errors: errorsWithSuggestion('const result = ready ? format(\nfirst,\nsecond\n) : [item];'),
		},
	],
});
