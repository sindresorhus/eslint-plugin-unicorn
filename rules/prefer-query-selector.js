'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const forbiddenIdentifierNames = [
	'getElementById',
	'querySelectorAll',
	'getElementsByClassName',
	'getElementsByTagName'
];

const VALID_QUOTES = /([',",`])/;
const getRange = (prop, node) => [prop.start, node.arguments[0].end];
const getReplacement = (ctx, identifierName, node) => {
	const argAsTxt = ctx.getSourceCode().getText(node.arguments[0]);
	if (identifierName === 'getElementById') {
		return `querySelector(${argAsTxt.replace(VALID_QUOTES, '$1#')}`;
	}
	const leftQuote = argAsTxt.slice(0, 1);
	const rightQuote = argAsTxt.slice(-1);
	const selector = argAsTxt.slice(1, -1).split(' ').filter(e => e).map(e => `.${e}`).join('');
	return `querySelector(${leftQuote}${selector}${rightQuote}`;
};

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;
			const prop = callee.property;

			if (!prop || callee.type !== 'MemberExpression' || !forbiddenIdentifierNames.includes(prop.name)) {
				return;
			}

			const identifierName = prop.name;
			const report = {
				node,
				message: `Prefer \`querySelector\` over \`${identifierName}\`.`,
				fix: fixer => fixer.replaceText(prop, 'querySelector')
			};

			if (identifierName === 'getElementById' || identifierName === 'getElementsByClassName') {
				report.fix = fixer => {
					const range = getRange(prop, node);
					const replacement = getReplacement(context, identifierName, node);
					return fixer.replaceTextRange(range, replacement);
				};
			}

			context.report(report);
		}
	};
};

module.exports = {
	create,
	meta: {
		docs: {
			url: getDocsUrl(__filename)
		},
		fixable: 'code'
	}
};
