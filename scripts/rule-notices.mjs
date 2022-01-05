import {createMark, getRuleInfo} from './utils.mjs';

export const RULE_NOTICE_MARK = createMark('RULE_NOTICE', 'generate-rule-notices');

const MESSAGES = {
	recommended: '✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*',
	fixable: '🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*',
	fixableAndHasSuggestions: '🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
	hasSuggestions: '💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*',
};
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
