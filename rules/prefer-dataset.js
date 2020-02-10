'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const isValidVariableName = require('./utils/is-valid-variable-name');

const getMethodName = memberExpression => memberExpression.property.name;

const getDataAttributeName = argument => {
	if (argument.type === 'Literal') {
		return (argument.value.match(/^data-(.+)/) || ['', ''])[1];
	}

	return '';
};

const parseNodeText = (context, argument) => context.getSourceCode().getText(argument);

const dashToCamelCase = string => string.replace(/-([a-z])/g, s => s[1].toUpperCase());

const getReplacement = (context, node, memberExpression, propertyName) => {
	const calleeObject = parseNodeText(context, memberExpression.object);
	const value = parseNodeText(context, node.arguments[1]);

	propertyName = dashToCamelCase(propertyName);

	if (!isValidVariableName(propertyName)) {
		return `${calleeObject}.dataset['${propertyName}'] = ${value}`;
	}

	return `${calleeObject}.dataset.${propertyName} = ${value}`;
};

const isBracketNotation = (context, callee) => {
	const bracketOpen = context
		.getSourceCode()
		.getFirstTokenBetween(callee.object, callee.property, {
			filter: token => token.value === '['
		});

	return bracketOpen !== null && bracketOpen.value === '[';
};

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;

			if (callee.type !== 'MemberExpression') {
				return;
			}

			if (getMethodName(callee) !== 'setAttribute') {
				return;
			}

			if (isBracketNotation(context, callee)) {
				return;
			}

			const attributeName = getDataAttributeName(node.arguments[0]);
			if (attributeName) {
				const replacement = getReplacement(context, node, callee, attributeName);
				context.report({
					node,
					message: 'Prefer `.dataset` over `setAttribute(…)`.',
					fix: fixer => fixer.replaceText(node, replacement)
				});
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
		fixable: 'code'
	}
};
