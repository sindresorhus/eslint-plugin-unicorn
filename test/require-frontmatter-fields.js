import test from 'ava';
import outdent from 'outdent';
import {Linter} from 'eslint';
import markdown from '@eslint/markdown';
import unicorn from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const options = [{
	fields: ['title', 'description', 'date'],
	types: {
		title: 'string',
		description: 'string',
		date: 'string',
	},
}];

const yamlTestCase = code => ({
	code,
	filename: 'example.md',
	language: languages.markdown,
	languageOptions: {frontmatter: 'yaml'},
	options,
});

ruleTest.snapshot({
	valid: [
		// The rule only checks files that have YAML frontmatter.
		yamlTestCase('# Title'),
		{
			code: outdent`
				---
				title: 1
				---

				# Hello
			`,
			filename: 'example.md',
			language: languages.markdown,
			options,
		},
		{
			code: outdent`
				---
				title: 1
				---

				# Hello
			`,
			filename: 'example.md',
			language: languages.markdown,
			languageOptions: {frontmatter: 'yaml'},
		},
		yamlTestCase(outdent`
			---
			title: Hello
			description: A description
			date: 2026-07-10
			draft: false
			priority: 1
			archived: null
			---

			# Hello
		`),
		yamlTestCase(outdent`
			---
			title: 'Hello'
			description: "A description"
			date: '2026-07-10'
			---

			# Hello
		`),
		{
			...yamlTestCase(outdent`
				---
				title: Hello
				views: 1
				draft: false
				archived: null
				---

				# Hello
			`),
			options: [{
				fields: ['title'],
				types: {
					views: 'number',
					draft: 'boolean',
					archived: 'null',
				},
			}],
		},
		{
			...yamlTestCase(outdent`
				---
				title: Hello
				---

				# Hello
			`),
			options: [{
				types: {
					draft: 'boolean',
				},
			}],
		},
		yamlTestCase(outdent`
			---
			title: Hello
			description: A description
			date: 2026-07-10
			tags:
				- eslint
				- markdown
			metadata:
				featured: true
			---

			# Hello
		`),
		{
			code: outdent`
				---
				title = 'Hello'
				---

				# Hello
			`,
			filename: 'example.md',
			language: languages.markdown,
			languageOptions: {frontmatter: 'toml'},
			options,
		},
		{
			code: outdent`
				---
				{
					"title": "Hello"
				}
				---

				# Hello
			`,
			filename: 'example.md',
			language: languages.markdown,
			languageOptions: {frontmatter: 'json'},
			options,
		},
		// YAML syntax errors are outside this rule's scope.
		yamlTestCase(outdent`
			---
			title: [Hello
			---

			# Hello
		`),
		{
			...yamlTestCase(outdent`
				---
				title: Hello
				description: A description
				date: 2026-07-10
				---

				| Heading |
				| --- |
				| Hello |
			`),
			language: {
				...languages.markdown,
				language: 'markdown/gfm',
			},
		},
	],
	invalid: [
		yamlTestCase(outdent`
			---
			? [complex, key]
			: ignored
			title: Hello
			---

			# Hello
		`),
		yamlTestCase(outdent`
			---
			title: Hello
			---

			# Hello
		`),
		{
			...yamlTestCase(outdent`
				---
				title: 1
				---

				# Hello
			`),
			options: [{
				types: {title: 'string'},
			}],
		},
		{
			code: '---\r\ntitle: Hello\r\ndescription: A description\r\ndate: 1\r\n---\r\n',
			filename: 'example.md',
			language: languages.markdown,
			languageOptions: {frontmatter: 'yaml'},
			options,
		},
		yamlTestCase(outdent`
			---
			title: Hello
			description: A description
			date: 1
			---

			# Hello
		`),
		yamlTestCase(outdent`
			---
			title: 1
			description: false
			date:
			---

			# Hello
		`),
		{
			...yamlTestCase(outdent`
				---
				title: Hello
				description: A description
				date: 2026-07-10
				featured: false
				---

				# Hello
			`),
			options: [{
				fields: ['title'],
				types: {
					featured: 'string',
				},
			}],
		},
		{
			...yamlTestCase(outdent`
				---
				title: 1 # A comment
				views: none
				draft: 'false'
				archived: false
				---

				# Hello
			`),
			language: {
				...languages.markdown,
				language: 'markdown/gfm',
			},
			options: [{
				fields: ['title'],
				types: {
					title: 'string',
					views: 'number',
					draft: 'boolean',
					archived: 'null',
				},
			}],
		},
		{
			...yamlTestCase(outdent`
				---
				title: [Hello]
				description: {content: A description}
				date: 2026-07-10
				---

				# Hello
			`),
			options: [{
				fields: ['title', 'description', 'date'],
				types: {
					title: 'string',
					description: 'string',
				},
			}],
		},
	],
});

test('reports a normalized NUL character at the correct location', t => {
	const linter = new Linter({configType: 'flat'});
	const code = `---\n# ${String.fromCodePoint(0)}\ntitle: 1\n---\n`;
	const [message] = linter.verify(code, {
		files: ['**'],
		language: 'markdown/commonmark',
		languageOptions: {frontmatter: 'yaml'},
		plugins: {
			markdown,
			unicorn,
		},
		rules: {
			'unicorn/require-frontmatter-fields': ['error', {
				fields: ['title'],
				types: {title: 'string'},
			}],
		},
	}, {filename: 'example.md'});

	t.like(message, {
		line: 3,
		column: 8,
		endLine: 3,
		endColumn: 9,
	});
});
