'use strict';
const path = require('path');

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

module.exports = ruleName => {
	ruleName = ruleName || path.basename(module.parent.filename, '.js');
	return `${repoUrl}/blob/master/docs/rules/${ruleName}.md`;
};
