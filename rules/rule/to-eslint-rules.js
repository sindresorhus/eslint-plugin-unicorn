import toEslintRule from './to-eslint-rule.js';

function toEslintRules(rules) {
	return Object.fromEntries(
		Object.entries(rules).map(([ruleId, rule]) => [
			ruleId,
			toEslintRule(ruleId, rule),
		]),
	);
}

export default toEslintRules;

