'use strict';
const {rules, ...baseConfigs} = require('./recommended.js');

module.exports = {
	...baseConfigs,
	rules: {
		...Object.fromEntries(Object.entries(rules)
			.filter(([_ruleId, severity]) => severity === 'error'),
		),
		'unicorn/no-array-for-each': 'off',
		'unicorn/no-array-reduce': 'off',
		'unicorn/no-null': 'off',
		'unicorn/prefer-switch': 'off',
	},
};