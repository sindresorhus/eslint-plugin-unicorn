'use strict';
const packageJson = require('../../package');

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

module.exports = ruleName => {
	return `${repoUrl}/blob/v${packageJson.version}/docs/rules/${ruleName}.md`;
};
