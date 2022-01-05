import outdent from 'outdent';
import {createMark, getRules} from './utils.mjs';

export const RULES_TABLE_MARK = createMark('RULES_TABLE', 'generate-rules-table');

// Config/preset/fixable emojis.
const EMOJI_RECOMMENDED = '✅';
const EMOJI_FIXABLE = '🔧';
const EMOJI_HAS_SUGGESTIONS = '💡';
export function getRulesTable() {
	const rules = getRules().filter(rule => !rule.isDeprecated);

	const rulesTableContent = rules.map(rule => {
		const url = `docs/rules/${rule.id}.md`;
		const link = `[${rule.id}](${url})`;

		const {description} = rule.meta.docs;

		return `| ${[
			link,
			description,
			rule.isRecommended ? EMOJI_RECOMMENDED : '',
			rule.isFixable ? EMOJI_FIXABLE : '',
			rule.hasSuggestions ? EMOJI_HAS_SUGGESTIONS : '',
		].join(' | ')} |`;
	}).join('\n');

	return outdent`
		| Name${'&nbsp;'.repeat(40)} | Description | ${EMOJI_RECOMMENDED} | ${EMOJI_FIXABLE} | ${EMOJI_HAS_SUGGESTIONS} |
		|${' :-- |'.repeat(5)}
		${rulesTableContent}
	`;
}
