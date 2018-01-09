'use strict';
const {basename} = require('path');

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

module.exports = function (ruleName, commitHash) {
	ruleName = ruleName || basename(module.parent.filename).replace('.js', '');
	commitHash = commitHash || 'master';

	return `${repoUrl}/blob/${commitHash}/docs/rules/${ruleName}.md`;
};
