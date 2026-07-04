import toEslintRule from './to-eslint-rule.js';

export default function toEslintRules(rules) {
	return Object.fromEntries(Object.entries(rules).map(([ruleId, rule]) => [
		ruleId,
		toEslintRule(ruleId, rule),
	]));
}

