'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');

const MESSAGE_ID = 'prefer-https';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{value}}`.'
};

const unsafeURLRegExp = /http:\/\/[\w#%+.:=@~-]{2,256}\.[a-z]{2,4}/g;
const httpRegExp = /http:\/\//;

//	Helper to determine if a string is an unsafe URL.
const containsHttp = nodeValue => unsafeURLRegExp.test(nodeValue);

//	Returns a function which iterates through each unsafe use of http, and replaces it with https.
const getFixer = node => fixer => {
	let fixed = node.value || '';
	for (const match in fixed.match(unsafeURLRegExp)) {
		if (match) {
			const fixedMatch = match.replace(httpRegExp, 'https://');
			fixed = fixed.replace(match, fixedMatch);
		}
	}

	return fixer.replaceText(node, fixed);
};

const create = context => {
	const sourceCode = context.getSourceCode();
	const reportPreferHttp = node => {
		return context.report({
			node,
			messageId: MESSAGE_ID,
			data: {
				value: 'http',
				replacement: 'https'
			},
			fix: getFixer(node)
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
		type: 'suggestion',
		docs: {
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages
	}
};
