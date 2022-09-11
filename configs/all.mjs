import recommended from './recommended.mjs';

const all = {
	...recommended,
	rules: Object.fromEntries(Object.entries(recommended.rules).map(
		([ruleId, severity]) => [ruleId, ruleId.startsWith('unicorn/') ? 'error' : severity],
	)),
};

export default all;
