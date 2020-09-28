'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'no-abusive-eslint-disable';
const disableRegex = /^eslint-disable(?:-next-line|-line)?(?<ruleId>$|(?:\s+(?:@(?:[\w-]+\/){1,2})?[\w-]+)?)/;

const create = context => ({
	Program: node => {
		for (const comment of node.comments) {
			const value = comment.value.trim();
			const result = disableRegex.exec(value);

			if (
				result && // It's a eslint-disable comment
				!result.groups.ruleId // But it did not specify any rules
			) {
				context.report({
					loc: {
						start: {
							...comment.loc.start,
							column: -1
						},
						end: comment.loc.end
					},
					messageId: MESSAGE_ID
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
			url: getDocumentationUrl(__filename)
		},
		messages: {
			[MESSAGE_ID]: 'Specify the rules you want to disable.'
		}
	}
};
