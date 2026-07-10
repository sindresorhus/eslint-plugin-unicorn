import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);

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

test.snapshot({
	valid: [
		// The rule only checks files that have YAML frontmatter.
		{
			code: '# Title',
			filename: 'example.md',
			language: languages.markdown,
			options,
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
			title: Hello
			---

			# Hello
		`),
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
