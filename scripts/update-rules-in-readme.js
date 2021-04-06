'use strict';

// Automatically regenerates the rules table in readme.md.

const fs = require('fs');
const path = require('path');
const {rules, configs} = require('../');

const pathReadme = path.resolve(__dirname, '../readme.md');
const readmeContents = fs.readFileSync(pathReadme, 'utf8');
const tablePlaceholder = /<!--RULES_TABLE_START-->[\S\s]*<!--RULES_TABLE_END-->/;

// Config/preset/fixable emojis.
const EMOJI_RECOMMENDED = '✅';
const EMOJI_FIXABLE = '🔧';

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

		return `| ${link} | ${description} | ${isRecommended ? EMOJI_RECOMMENDED : ''} | ${isFixable ? EMOJI_FIXABLE : ''} |`;
	})
	.join('\n');

fs.writeFileSync(
	pathReadme,
	readmeContents.replace(
		tablePlaceholder,
		`<!--RULES_TABLE_START-->\n\n| Name | Description | ${EMOJI_RECOMMENDED} | ${EMOJI_FIXABLE} |\n|:--------|:--------|:---|:---|\n${rulesTableContent}\n\n<!--RULES_TABLE_END-->`
	)
);
