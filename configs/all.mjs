import recommended from './recommended.mjs'

export default {
	...recommended,
	rules: Object.fromEntries(Object.entries(recommended.rules).map(
		([ruleId, severity]) => [ruleId, ruleId.startsWith('unicorn/') ? 'error' : severity],
	)),
}
