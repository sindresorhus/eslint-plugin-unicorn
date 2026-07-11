import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const options = [{
	fields: ['title', 'description', 'date'],
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
			title: [Hello]
			description: false
			date:
			---

			# Hello
		`),
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
		// Unresolved aliases are YAML errors outside this rule's scope.
		yamlTestCase(outdent`
			---
			title: *missing
			---

			# Hello
		`),
		yamlTestCase(outdent`
			---
			title: Hello
			metadata:
				value: *missing
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
		{
			...yamlTestCase(outdent`
				---
				---

				# Hello
			`),
			options: [{fields: ['title']}],
		},
		yamlTestCase(outdent`
			---
			- title: Hello
			---

			# Hello
		`),
		{
			...yamlTestCase(outdent`
				---
				metadata: {title: Hello}
				---

				# Hello
			`),
			options: [{fields: ['title']}],
		},
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
	],
});
