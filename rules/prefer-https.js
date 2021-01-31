'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-https';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.'
};

//	Helper to determine if a string is an unsafe URL.
const containsHttp = nodeValue => /http:\/\/(www\.)?[\w#%+.:=@~-]{2,256}\.[a-z]{2,4}\b([\w#%&+./:=?@~-]*)/.test(nodeValue); // eslint-disable-line unicorn/prefer-https

const create = context => {
	const sourceCode = context.getSourceCode();
	const reportPreferHttp = node => {
		const fixed = node.value.replace('http', 'https');
		return context.report({
			node,
			messageId: MESSAGE_ID,
			data: {
				value: 'http',
				replacement: 'https'
			},
			fix: fixer => fixer.replaceText(node, fixed)
		});
	};

	return {
		Program() {
			//	Find & report any http URLs in comments.
			const comments = sourceCode.getAllComments();
			for (const comment in comments) {
				if (containsHttp(comment.value)) {
					reportPreferHttp(comment);
				}
			}
		},
		'Literal, TemplateElement': node => {
			if (containsHttp(node.value)) {
				reportPreferHttp(node);
			}
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'problem',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
