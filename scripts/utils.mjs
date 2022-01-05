import eslintPluginUnicorn from '../index.js';

const {rules, configs} = eslintPluginUnicorn;

export function getRecommendedRules() {
	const rules = Object.entries(configs.recommended.rules).filter(([, config]) => ['error', 'warn'].includes(config))
		.map(([id]) => id.slice('unicorn/'.length));

	return new Set(rules);
}

const MESSAGES = {
	recommended: '✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*',
	fixable: '🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*',
	fixableAndHasSuggestions: '🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
	hasSuggestions: '💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
};

export const RULE_NOTICE_COMMENT= '<!-- Do not manually modify RULE_NOTICE part -->';
export const RULE_NOTICE_START_MARK = '<!-- RULE_NOTICE -->';
export const RULE_NOTICE_END_MARK = '<!-- /RULE_NOTICE -->';

const recommendedRules = getRecommendedRules();
export function getRuleNoticesSectionBody(ruleId) {
	const notices = [];

	if (recommendedRules.has(ruleId)) {
		notices.push(MESSAGES.recommended);
	}

	const {meta} = rules[ruleId];

	if (meta.fixable) {
		notices.push(meta.hasSuggestions ? MESSAGES.fixableAndHasSuggestions : MESSAGES.fixable);
	} else if (meta.hasSuggestions) {
		notices.push(MESSAGES.hasSuggestions);
	}

	return notices.join('\n\n');
}
