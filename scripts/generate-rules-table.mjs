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

// Generate rule table contents.
const rulesTableContent = Object.keys(rules).filter(ruleName => !rules[ruleName].meta.deprecated)
	.sort()
	.map(ruleName => {
		// Check which emojis to show for this rule.
		const isRecommended = configs.recommended.rules[`unicorn/${ruleName}`] === 'error';
		const isFixable = rules[ruleName].meta.fixable;

		const url = `docs/rules/${ruleName}.md`;
		const link = `<a href="${url}">${ruleName}</a>`;

		const {description} = rules[ruleName].meta.docs;

		return `<tr><td>${link}</td><td>
		
		${description}
		
		</td><td>${isRecommended ? EMOJI_RECOMMENDED : ''}</td><td>${isFixable ? EMOJI_FIXABLE : ''}</td></tr>`;
	})
	.join('\n');

writeFileSync(
	pathReadme,
	readmeContents.replace(
		tablePlaceholder,
		outdent`
			<!-- RULES_TABLE_START -->

			<table>
				<thead>
					<tr>
						<th width="250">Name</th>
						<th>Description</th>
						<th>${EMOJI_RECOMMENDED}</th>
						<th>${EMOJI_FIXABLE}</th>
					</tr>
				</thead>
				<tbody>
					${rulesTableContent}
				</tbody>
			</table>

			<!-- RULES_TABLE_END -->
		`
	)
);
