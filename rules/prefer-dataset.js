'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const getMethodName = memberExpression => memberExpression.property.name;

const getDataAttributeName = arg => {
	if (arg.type === 'Literal') {
		return (arg.value.match(/^data-(.+)/) || ['', ''])[1];
	}

	return '';
};

const parseValueArgument = (context, arg) => {
	return context.getSourceCode().getText(arg);
};

const dashToCamelCase = str => {
	return str.replace(/-([a-z])/g, s => s[1].toUpperCase());
};

const getReplacement = (context, node, memberExpression, propertyName) => {
	const objectName = memberExpression.object.name;
	const value = parseValueArgument(context, node.arguments[1]);

	propertyName = dashToCamelCase(propertyName);

	if (propertyName.match(/[.:]/)) {
		return `${objectName}.dataset['${propertyName}'] = ${value}`;
	}

	return `${objectName}.dataset.${propertyName} = ${value}`;
};

const isBracketNotation = (context, callee) => {
	const bracketOpen = context.getSourceCode().getFirstTokenBetween(callee.object, callee.property, {filter: token => {
		return token.value === '[';
	}});

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
					message: 'Prefer `dataset` over `setAttribute`',
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
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
