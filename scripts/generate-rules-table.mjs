// Automatically regenerates the rules table in readme.md.

import {readFileSync, writeFileSync} from 'fs';
import path from 'path';
import package_ from '../index.js';
import {fileURLToPath} from 'url';
import outdent from 'outdent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {rules, configs} = package_;
const pathReadme = path.resolve(__dirname, '../readme.md');
const readmeContents = readFileSync(pathReadme, 'utf8');
const tablePlaceholder = /<!-- RULES_TABLE_START -->.*<!-- RULES_TABLE_END -->/s;

// Config/preset/fixable emojis.
const EMOJI_RECOMMENDED = '✅';
const EMOJI_FIXABLE = '🔧';

const MAX_DESCRIPTION_LENGTH = 100; // To avoid making the description column too wide at the expense of the name column.

// Generate rule table contents.
const rulesTableContent = Object.keys(rules).filter(ruleName => !rules[ruleName].meta.deprecated)
	.sort()
	.map(ruleName => {
		// Check which emojis to show for this rule.
		const isRecommended = configs.recommended.rules[`unicorn/${ruleName}`] === 'error';
		const isFixable = rules[ruleName].meta.fixable;

		const url = `docs/rules/${ruleName}.md`;
		const link = `[${ruleName}](${url})`;

		const {description} = rules[ruleName].meta.docs;
		const descriptionTrimmed = description.length > MAX_DESCRIPTION_LENGTH ? description.slice(0, MAX_DESCRIPTION_LENGTH) + '...' : description;

		return `| ${link} | ${descriptionTrimmed} | ${isRecommended ? EMOJI_RECOMMENDED : ''} | ${isFixable ? EMOJI_FIXABLE : ''} |`;
	})
	.join('\n');

writeFileSync(
	pathReadme,
	readmeContents.replace(
		tablePlaceholder,
		outdent`
			<!-- RULES_TABLE_START -->

			| Name | Description | ${EMOJI_RECOMMENDED} | ${EMOJI_FIXABLE} |
			| :--- | :---------- | :------------------- | :--------------- |
			${rulesTableContent}

			<!-- RULES_TABLE_END -->
		`
	)
);
