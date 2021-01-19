'use strict';
const packageJson = require('../../package');
const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

function createDeprecatedRules(data) {
	const rules = {};
	for (const [ruleId, replacedBy = []] of Object.entries(data)) {
		rules[ruleId] = {
			create: () => ({}),
			meta: {
				docs: {
					url: `${repoUrl}/blob/v${packageJson.version}/docs/deprecated-rules.md#${ruleId}`
				},
				deprecated: true,
				replacedBy: Array.isArray(replacedBy) ? replacedBy : [replacedBy]
			}
		};
	}

	return rules;
}

module.exports = createDeprecatedRules;
