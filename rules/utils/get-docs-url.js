'use strict';

const repoUrl = 'https://github.com/sindresorhus/eslint-plugin-unicorn';

function getDocsUrl(ruleName, givenCommitHash) {
	let commitHash = givenCommitHash;
	if (!commitHash) {
		commitHash = 'master';
	}
	return `${repoUrl}/blob/${commitHash}/docs/rules/${ruleName}.md`;
}

module.exports = getDocsUrl;
