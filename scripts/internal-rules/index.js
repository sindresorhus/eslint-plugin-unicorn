'use strict';

const pluginName = 'internal-rules';

const rules = [
	'prefer-negative-boolean-attribute',
	'prefer-disallow-over-forbid',
];

module.exports = {
	rules: Object.fromEntries(rules.map(id => [id, require(`./${id}.js`)])),
	configs: {
		all: {
			plugins: [pluginName],
			rules: Object.fromEntries(rules.map(id => [`${pluginName}/${id}`, 'error'])),
		},
	},
};
