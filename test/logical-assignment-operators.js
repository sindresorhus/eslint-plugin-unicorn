import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const options = ['always', {enforceForIfStatements: true}];
const ifErrorWithSuggestions = (orOutput, nullishOutput) => ({
	messageId: 'if',
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
					messageId: 'if',
					suggestions: [],
				},
			],
		},
	],
});
