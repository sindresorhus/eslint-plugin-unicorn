'use strict';
const conflictingRules = require('./conflicting-rules.js');

module.exports = {
	...require('./base.js'),
	rules: {
		...Object.fromEntries(
			Object.entries(require('./recommended.js').rules)
				.filter(
					ruleEntry =>
						!Object.keys(conflictingRules.rules).includes(ruleEntry[0]),
				)
				.map(ruleEntry => [ruleEntry[0], 'error']),
		),
		...conflictingRules.rules,
	},
};
