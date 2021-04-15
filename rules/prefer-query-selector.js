'use strict';
const getDocumentationUrl = require('./utils/get-documentation-url');
const methodSelector = require('./utils/method-selector');
const {notDomNodeSelector} = require('./utils/not-dom-node');

const MESSAGE_ID = 'prefer-query-selector';
const messages = {
	[MESSAGE_ID]: 'Prefer `.{{replacement}}()` over `.{{method}}()`.'
};

const selector = [
	methodSelector({
		names: ['getElementById', 'getElementsByClassName', 'getElementsByTagName'],
		length: 1
	}),
	notDomNodeSelector('callee.object')
].join('');

const forbiddenIdentifierNames = new Map([
	['getElementById', 'querySelector'],
	['getElementsByClassName', 'querySelectorAll'],
	['getElementsByTagName', 'querySelectorAll']
]);

const getReplacementForId = value => `#${value}`;
const getReplacementForClass = value => value.match(/\S+/g).map(className => `.${className}`).join('');

const getQuotedReplacement = (node, value) => {
	const leftQuote = node.raw.charAt(0);
	const rightQuote = node.raw.charAt(node.raw.length - 1);
	return `${leftQuote}${value}${rightQuote}`;
};

function * getLiteralFix(fixer, node, identifierName) {
	let replacement = node.raw;
	if (identifierName === 'getElementById') {
		replacement = getQuotedReplacement(node, getReplacementForId(node.value));
	}

	if (identifierName === 'getElementsByClassName') {
		replacement = getQuotedReplacement(node, getReplacementForClass(node.value));
	}

	yield fixer.replaceText(node, replacement);
}

function * getTemplateLiteralFix(fixer, node, identifierName) {
	yield fixer.insertTextAfter(node, '`');
	yield fixer.insertTextBefore(node, '`');

	for (const templateElement of node.quasis) {
		if (identifierName === 'getElementById') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForId(templateElement.value.cooked)
			);
		}

		if (identifierName === 'getElementsByClassName') {
			yield fixer.replaceText(
				templateElement,
				getReplacementForClass(templateElement.value.cooked)
			);
		}
	}
}

const canBeFixed = node => {
	if (node.type === 'Literal') {
		return node.raw === 'null' || (typeof node.value === 'string' && Boolean(node.value.trim()));
	}

	if (node.type === 'TemplateLiteral') {
		return (
			node.expressions.length === 0 &&
			node.quasis.some(templateElement => templateElement.value.cooked.trim())
		);
	}

	return false;
};

const hasValue = node => {
	if (node.type === 'Literal') {
		return node.value;
	}

	return true;
};

const fix = (node, identifierName, preferredSelector) => {
	const nodeToBeFixed = node.arguments[0];
	if (identifierName === 'getElementsByTagName' || !hasValue(nodeToBeFixed)) {
		return fixer => fixer.replaceText(node.callee.property, preferredSelector);
	}

	const getArgumentFix = nodeToBeFixed.type === 'Literal' ? getLiteralFix : getTemplateLiteralFix;
	return function * (fixer) {
		yield * getArgumentFix(fixer, nodeToBeFixed, identifierName);
		yield fixer.replaceText(node.callee.property, preferredSelector);
	};
};

const create = context => {
	return {
		[selector](node) {
			const method = node.callee.property.name;
			const preferredSelector = forbiddenIdentifierNames.get(method);

			const problem = {
				node: node.callee.property,
				messageId: MESSAGE_ID,
				data: {
					replacement: preferredSelector,
					method
				}
			};

			if (canBeFixed(node.arguments[0])) {
				problem.fix = fix(node, method, preferredSelector);
			}

			context.report(problem);
		}
	};
};

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()`.',
			url: getDocumentationUrl(__filename)
		},
		fixable: 'code',
		messages,
		schema: []
	}
};
