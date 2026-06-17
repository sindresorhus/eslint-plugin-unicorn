import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const options = ['always', {enforceForIfStatements: true}];
const ifErrorWithSuggestions = (orOutput, nullishOutput) => ({
	messageId: 'ifNullish',
	suggestions: [
		{
			messageId: 'convertIf',
			output: orOutput,
		},
		{
			messageId: 'convertIf',
			output: nullishOutput,
		},
	],
});

test({
	valid: [
		'foo ||= bar;',
		'foo ??= bar;',
		'if (foo) { foo = bar; }',
	],
	invalid: [
		{
			code: 'if (!foo) { foo = bar; }',
			options,
			errors: [
				ifErrorWithSuggestions('foo ||= bar;', 'foo ??= bar;'),
			],
		},
		{
			code: 'if (!foo) { foo = bar }',
			options,
			errors: [
				ifErrorWithSuggestions('foo ||= bar;', 'foo ??= bar;'),
			],
		},
		{
			code: 'if (!foo) foo = bar;',
			options,
			errors: [
				ifErrorWithSuggestions('foo ||= bar;', 'foo ??= bar;'),
			],
		},
		{
			code: 'if (!foo[bar.baz]) { foo[bar.baz] = qux; }',
			options,
			errors: [
				ifErrorWithSuggestions('foo[bar.baz] ||= qux;', 'foo[bar.baz] ??= qux;'),
			],
		},
		{
			code: 'foo = foo || bar;',
			output: 'foo ||= bar;',
			errors: [
				{
					messageId: 'assignment',
				},
			],
		},
		{
			code: 'if (foo == null) { foo = bar; }',
			output: 'foo ??= bar;',
			options,
			errors: [
				{
					messageId: 'if',
				},
			],
		},
		{
			code: 'foo ||= bar;',
			output: 'foo = foo || bar;',
			options: ['never'],
			errors: [
				{
					messageId: 'unexpected',
				},
			],
		},
		{
			code: 'if (!foo /* comment */) { foo = bar; }',
			options,
			errors: [
				{
					messageId: 'ifNullish',
					suggestions: [],
				},
			],
		},
		// A truthy `if` maps to `&&=` only, so it keeps the base single-operator message
		{
			code: 'if (foo) { foo = bar; }',
			output: 'foo &&= bar;',
			options,
			errors: [
				{
					messageId: 'if',
				},
			],
		},
		// The falsy `if` message names both operators
		{
			code: 'if (!baz) { baz = qux; }',
			options,
			errors: [
				{
					message: '\'if\' statement can be replaced with a logical operator assignment with operator ||= or ??=.',
					suggestions: [
						{messageId: 'convertIf', output: 'baz ||= qux;'},
						{messageId: 'convertIf', output: 'baz ??= qux;'},
					],
				},
			],
		},
		// The nullish `if` keeps the base message, naming only `??=`
		{
			code: 'if (baz == null) { baz = qux; }',
			output: 'baz ??= qux;',
			options,
			errors: [
				{
					message: '\'if\' statement can be replaced with a logical operator assignment with operator ??=.',
				},
			],
		},
	],
});
