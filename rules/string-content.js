'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const generateMessage = (suggest, match) => `Use \`${suggest}\` instead of \`${match}\`.`;

const fix = (value, matchedOptions) => {
	return matchedOptions.reduce((acc, {match, suggest}) => {
		const regexp = new RegExp(match, 'g');
		return acc.replace(regexp, suggest);
	}, value);
};

const create = context => {
	return {
		Literal(node) {
			if (typeof node.value !== 'string') {
				return;
			}

			if (context.options.lenght === 0) {
				return;
			}

			const matchedOptions = context.options
				.filter(({match}) => Boolean(node.raw.match(match)));

			matchedOptions.forEach(({suggest, match}) => {
				if (node.raw.match(match)) {
					context.report({
						node,
						message: generateMessage(suggest, match),
						fix: fixer => fixer.replaceText(node, fix(node.raw, matchedOptions))
					});
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
