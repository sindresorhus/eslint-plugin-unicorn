'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const disableRegex = /^eslint-disable(-next-line|-line)?($|(\s+(@[\w-]+\/(?:[\w-]+\/)?)?[\w-]+)?)/;

const create = context => ({
	Program: node => {
		for (const comment of node.comments) {
			const value = comment.value.trim();
			const res = disableRegex.exec(value);

			if (
				res && // It's a eslint-disable comment
				!res[2] // But it did not specify any rules
			) {
				context.report({
					loc: {
						start: {
							...comment.loc.start,
							column: -1
						},
						end: comment.loc.end
					},
					message: 'Specify the rules you want to disable.'
				});
			}
		}
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
