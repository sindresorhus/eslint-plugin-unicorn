'use strict';

function getBuiltinRule(id) {
	// TODO: Remove this when we drop support for ESLint 7
	const eslintVersion = require('eslint/package.json').version;
	/* istanbul ignore next */
	if (eslintVersion.startsWith('7.')) {
		return require(`eslint/lib/rules/${id}`);
	}

	return require('eslint/use-at-your-own-risk').builtinRules.get(id);
}

module.exports = getBuiltinRule;
