'use strict';
const path = require('path');

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

module.exports = (ruleName, commitHash) => {
	ruleName = ruleName || path.basename(module.parent.filename, '.js');
	commitHash = commitHash || 'master';

	return `${repoUrl}/blob/${commitHash}/docs/rules/${ruleName}.md`;
};
