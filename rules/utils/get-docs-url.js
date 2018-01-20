'use strict';
const path = require('path');
const pkg = require('../../package');

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

module.exports = ruleName => {
	ruleName = ruleName || path.basename(module.parent.filename, '.js');
	return `${repoUrl}/blob/v${pkg.version}/docs/rules/${ruleName}.md`;
};
