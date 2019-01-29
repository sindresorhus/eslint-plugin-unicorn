'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const create = context => {
	return {
		'MemberExpression Identifier[name=addEventListener]': node => {
			const callExp = node.parent.parent;
			const callback = callExp.arguments[1];
			const {body} = callback;
			const eventParam = callback.params[0];
			const sourceCode = context.getSourceCode();
			const tokens = sourceCode.getTokens(body);
			const problematicTokens = tokens.filter(
				t =>
					t.type === 'Identifier' &&
					['keyCode', 'charCode', 'which'].indexOf(t.value) > -1
			);
			problematicTokens.forEach(problematicToken => {
				const eventToken = sourceCode.getTokenBefore(problematicToken, {
					skip: 1
				});
				if (eventToken.value === eventParam.name) {
					context.report({
						message: `Use key instead of ${
							problematicToken.value
						}. See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key`,
						node: problematicToken
					});
				}
			});
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		}
	}
};
