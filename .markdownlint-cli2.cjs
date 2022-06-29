'use strict';

module.exports = {
	config: {
		'line-length': false,
		'no-duplicate-heading': false,
		'no-hard-tabs': false,
		'ul-style': {
			style: 'dash',
		},
	},
	ignores: [
		'**/node_modules/**',
		'test/snapshots/**',
		'test/integration/fixtures/**',
	],
};
