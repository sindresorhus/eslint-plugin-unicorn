import outdent from 'outdent';
import test from 'ava';
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
		{
			code: 'let result = () => a ? b : c; if (test) { result = other; }',
			errors: errorsWithSuggestion('const result = test ? other : () => a ? b : c;'),
		},
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
	const result = new Linter().verifyAndFix(code, {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-ternary': 'error',
			'unicorn/prefer-minimal-ternary': 'error',
			'unicorn/no-nested-ternary': 'error',
		},
	});

	t.deepEqual(result.messages, []);
	t.false(result.fixed);
	t.is(result.output, code);
});

// Preserve statement bodies and multiline containers, not ordinary line wrapping.
testRule({
	valid: [
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
			// The shared assignment target is outside the resulting ternary.
			code: 'if (ready) { object[`first\nsecond`] = a; } else { object[`first\nsecond`] = b; }',
			output: 'object[`first\nsecond`] = ready ? a : b;',
			errors,
		},
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
