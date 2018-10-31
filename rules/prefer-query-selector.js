'use strict';
const getDocsUrl = require('./utils/get-docs-url');

const forbiddenIdentifierNames = {
	getElementById: 'querySelector',
	getElementsByClassName: 'querySelectorAll',
	getElementsByTagName: 'querySelectorAll'
};

const VALID_QUOTES = /([',",`])/;
const getRange = (prop, node) => [prop.start, node.arguments[0].end];
const getReplacement = (context, identifierName, node) => {
	const argAsTxt = context.getSourceCode().getText(node.arguments[0]);
	if (identifierName === 'getElementById') {
		return `querySelector(${argAsTxt.replace(VALID_QUOTES, '$1#')}`;
	}
	const leftQuote = argAsTxt.slice(0, 1);
	const rightQuote = argAsTxt.slice(-1);
	const selector = argAsTxt.slice(1, -1).split(' ').filter(e => e).map(e => `.${e}`).join('');
	return `querySelectorAll(${leftQuote}${selector}${rightQuote}`;
};

const create = context => {
	return {
		CallExpression(node) {
			const {callee} = node;
			const prop = callee.property;

			const identifierName = prop.name;
			const preferedSelector = forbiddenIdentifierNames[identifierName];
			if (!prop || callee.type !== 'MemberExpression' || !preferedSelector) {
				return;
			}

			const report = {
				node,
				message: `Prefer \`${preferedSelector}\` over \`${identifierName}\`.`,
				fix: fixer => fixer.replaceText(prop, preferedSelector)
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
