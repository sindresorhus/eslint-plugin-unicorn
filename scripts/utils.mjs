import fs from 'node:fs/promises';
import outdent from 'outdent';
import eslintPluginUnicorn from '../index.js';

const {rules, configs} = eslintPluginUnicorn;

function getRuleInfo(ruleId) {
	const rule = rules[ruleId];

	return {
		id: ruleId,
		meta: rule.meta,
		get isRecommended() {
			return ['error', 'warn'].includes(configs.recommended.rules[`unicorn/${ruleId}`]);
		},
		get isDeprecated() {
			return Boolean(rule.meta.deprecated);
		},
		get isFixable() {
			return Boolean(rule.meta.fixable);
		},
		get hasSuggestions() {
			return Boolean(rule.meta.hasSuggestions);
		},
	};
}

export function getRules() {
	return Object.keys(rules).sort().map(ruleId => getRuleInfo(ruleId));
}

const MESSAGES = {
	recommended: '✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*',
	fixable: '🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*',
	fixableAndHasSuggestions: '🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
	hasSuggestions: '💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
};

const createHtmlComment = comment => `<!-- ${comment} -->`;
const createMarkers = (marker, script) => ({
	comment: createHtmlComment(`Do not manually modify ${marker} part. Run: \`npm run ${script}\``),
	start: createHtmlComment(marker),
	end: createHtmlComment(`/${marker}`),
});
export const RULE_NOTICE_MARKER = createMarkers('RULE_NOTICE', 'generate-rule-notices');

export function getRuleNoticesSectionBody(ruleId) {
	const rule = getRuleInfo(ruleId);

	const notices = [];

	if (rule.isRecommended) {
		notices.push(MESSAGES.recommended);
	}

	if (rule.isFixable) {
		notices.push(rule.hasSuggestions ? MESSAGES.fixableAndHasSuggestions : MESSAGES.fixable);
	} else if (rule.hasSuggestions) {
		notices.push(MESSAGES.hasSuggestions);
	}

	return notices.join('\n\n');
}

function replaceContentInsideMarkers(original, text, marker) {
	const startMarkIndex = original.indexOf(marker.start);
	const endMarkIndex = original.indexOf(marker.end);

	if (startMarkIndex === -1) {
		throw new Error(`'${marker.start}' mark lost.`);
	}

	if (endMarkIndex === -1) {
		throw new Error(`'${marker.end}' mark lost.`);
	}

	if (startMarkIndex > endMarkIndex) {
		throw new Error(`'${marker.start}' should used before '${marker.end}'.`);
	}

	if (text) {
		text = `${text}\n`;
	}

	text = `\n${text}`;

	const before = original.slice(0, startMarkIndex + marker.start.length);
	const after = original.slice(endMarkIndex);

	return before + text + after;
}

export async function updateFileContentInsideMarkers(file, text, marker) {
	const original = await fs.readFile(file, 'utf8');
	const content = replaceContentInsideMarkers(original, text, marker);

	if (content === original) {
		return;
	}

	await fs.writeFile(file, content);
}

export const RULES_TABLE_MARKER = createMarkers('RULES_TABLE', 'generate-rules-table');
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
