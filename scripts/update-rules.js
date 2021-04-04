'use strict';

// Automatically regenerates the rules table in readme.md.

const fs = require('fs');
const path = require('path');
const {rules, configs} = require('../');

const pathReadme = path.resolve(__dirname, '../README.md');
const readmeContents = fs.readFileSync(pathReadme, 'utf8');
const tablePlaceholder = /<!--RULES_TABLE_START-->[\S\s]*<!--RULES_TABLE_END-->/;

// Config/preset/fixable emojis.
const EMOJI_RECOMMENDED = ':white_check_mark:';
const EMOJI_FIXABLE = ':wrench:';

// Generate rule table contents.
const rulesTableContent = Object.keys(rules).filter(ruleName => !rules[ruleName].meta.deprecated)
	.sort()
	.map(ruleName => {
		// Check which emojis to show for this rule.
		const isRecommended = Object.prototype.hasOwnProperty.call(configs.recommended.rules, `unicorn/${ruleName}`);
		const isFixable = rules[ruleName].meta.fixable;

		const emojis = [
			isRecommended ? EMOJI_RECOMMENDED : '',
			isFixable ? EMOJI_FIXABLE : ''
		].join('');

		const url = `docs/rules/${ruleName}.md`;
		const link = `[${ruleName}](${url})`;

		const {description} = rules[ruleName].meta.docs;

		return `| ${emojis} | ${link} | ${description} |`;
	})
	.join('\n');

fs.writeFileSync(
	pathReadme,
	readmeContents.replace(
		tablePlaceholder,
		`<!--RULES_TABLE_START-->\n\n|    | Name | Description |\n|:---|:--------|:--------|\n${rulesTableContent}\n\n<!--RULES_TABLE_END-->`
	)
);
