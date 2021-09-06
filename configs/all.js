'use strict';
const eslintRecommended = require('./eslint-recommended.js');

module.exports = {
	...require('./base.js'),
	rules: {
		...Object.fromEntries(
			Object.entries(require('./recommended.js').rules)
				.filter(
					ruleEntry =>
						!Object.keys(eslintRecommended.rules).includes(ruleEntry[0]),
				)
				.map(ruleEntry => [ruleEntry[0], 'error']),
		),
		...eslintRecommended.rules,
	},
};
