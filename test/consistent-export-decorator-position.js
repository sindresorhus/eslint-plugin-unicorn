import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typescriptParser = {
	languageOptions: {
		parser: parsers.typescript,
	},
};

const withTypescriptParser = testCase => {
	if (typeof testCase === 'string') {
		return {
			code: testCase,
			...typescriptParser,
		};
	}

	return {
		...testCase,
		...typescriptParser,
	};
};

test.snapshot({
	valid: [
		'@decorator\nexport default class Foo {}',
		'@decorator\nexport default class {}',
		'@foo\n@bar(options)\nexport default class Foo {}',
		'@decorator\nexport class Foo {}',
		'@foo\n@bar(options)\nexport class Foo {}',
		outdent`
			@decorator(
				foo
			)
			export class Foo {}
		`,
		{
			code: '@decorator export default class Foo {}',
			options: ['before'],
		},
		{
			code: '@foo @bar(options) export default class Foo {}',
			options: ['before'],
		},
		{
			code: '@decorator export class Foo {}',
			options: ['before'],
		},
		{
			code: outdent`
				@decorator(
					foo
				) export class Foo {}
			`,
			options: ['before'],
		},
		{
			code: 'export default @decorator class Foo {}',
			options: ['after'],
		},
		{
			code: 'export default @foo @bar(options) class Foo {}',
			options: ['after'],
		},
		{
			code: 'export @decorator class Foo {}',
			options: ['after'],
		},
		'class Foo {}',
		'@decorator\nclass Foo {}',
		'export default class Foo {}',
		'export class Foo {}',
		'export default (@decorator class Foo {})',
		'export default class Foo { @decorator method() {} }',
		'export {Foo}',
	].map(testCase => withTypescriptParser(testCase)),
	invalid: [
		'export default @decorator class Foo {}',
		'export default @decorator class {}',
		'@decorator export default class Foo {}',
		'export @decorator class Foo {}',
		'@decorator export class Foo {}',
		'export default\n@decorator\nclass Foo {}',
		'export\n@decorator\nclass Foo {}',
		'export default @foo @bar(options) class Foo {}',
		'@foo @bar(options) export default class Foo {}',
		'@foo\n@bar export class Foo {}',
		'@foo export @bar class Foo {}',
		'@foo export default @bar class Foo {}',
		outdent`
			@decorator(
				foo
			) export class Foo {}
		`,
		outdent`
			namespace N {
				@decorator export class Foo {}
			}
		`,
		{
			code: '@decorator\nexport default class Foo {}',
			options: ['before'],
		},
		{
			code: '@foo\n@bar export class Foo {}',
			options: ['before'],
		},
		{
			code: '@foo export @bar class Foo {}',
			options: ['before'],
		},
		{
			code: '@foo export default @bar class Foo {}',
			options: ['before'],
		},
		{
			code: 'export default @decorator class Foo {}',
			options: ['before'],
		},
		{
			code: '@decorator\nexport class Foo {}',
			options: ['before'],
		},
		{
			code: 'export @decorator class Foo {}',
			options: ['before'],
		},
		{
			code: '@decorator\nexport default class Foo {}',
			options: ['after'],
		},
		{
			code: '@decorator export default class Foo {}',
			options: ['after'],
		},
		{
			code: '@decorator\nexport class Foo {}',
			options: ['after'],
		},
		{
			code: '@decorator export class Foo {}',
			options: ['after'],
		},
		{
			code: '@foo export @bar class Foo {}',
			options: ['after'],
		},
		{
			code: '@foo export default @bar class Foo {}',
			options: ['after'],
		},
		{
			code: 'export default @decorator(/* comment */ value) class Foo {}',
		},
		{
			code: 'export default /* comment */ @decorator class Foo {}',
		},
		{
			code: '@decorator /* comment */ export default class Foo {}',
		},
		{
			code: '@decorator\nexport default abstract class Foo {}',
			options: ['after'],
		},
		outdent`
			export default @decorator class Foo {
				method() {}
			}
		`,
	].map(testCase => withTypescriptParser(testCase)),
});

test({
	valid: [],
	invalid: [
		{
			code: '@foo export @bar @baz class Foo {}',
			output: '@foo @bar @baz export class Foo {}',
			options: ['before'],
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 13,
					endColumn: 17,
				},
			],
		},
		{
			code: 'export default @foo(class {}) class Foo {}',
			output: '@foo(class {})\nexport default class Foo {}',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 16,
					endColumn: 30,
				},
			],
		},
		{
			code: 'export @foo(class {}) class Foo {}',
			output: '@foo(class {}) export class Foo {}',
			options: ['before'],
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 8,
					endColumn: 22,
				},
			],
		},
		{
			code: '@foo\nexport @bar class Foo {}',
			output: '@foo\n@bar\nexport class Foo {}',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 2,
					column: 8,
					endColumn: 12,
				},
			],
		},
		{
			code: '@foo\nexport @bar class Foo {}',
			output: '@foo @bar export class Foo {}',
			options: ['before'],
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 1,
					endColumn: 5,
				},
			],
		},
		{
			code: '@foo\nexport @bar class Foo {}',
			output: 'export @foo @bar class Foo {}',
			options: ['after'],
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 1,
					endColumn: 5,
				},
			],
		},
		{
			code: '@foo /* comment */ export @bar class Foo {}',
			options: ['before'],
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 27,
					endColumn: 31,
				},
			],
		},
		{
			code: '/* comment */ @decorator export class Foo {}',
			output: '/* comment */ @decorator\nexport class Foo {}',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 15,
					endColumn: 25,
				},
			],
		},
		{
			code: 'foo(); @decorator export class Foo {}',
			output: 'foo(); @decorator\nexport class Foo {}',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 8,
					endColumn: 18,
				},
			],
		},
		{
			code: 'namespace N { const value = 1; @decorator export class Foo {} }',
			output: 'namespace N { const value = 1; @decorator\nexport class Foo {} }',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 32,
					endColumn: 42,
				},
			],
		},
		{
			code: 'namespace N { @decorator export class Foo {} }',
			output: 'namespace N { @decorator\nexport class Foo {} }',
			errors: [
				{
					messageId: 'consistent-export-decorator-position',
					line: 1,
					column: 15,
					endColumn: 25,
				},
			],
		},
	].map(testCase => withTypescriptParser(testCase)),
});
