'use strict';
const {isParenthesized, getStaticValue} = require('eslint-utils');
const needsSemicolon = require('./utils/needs-semicolon.js');
const {newExpressionSelector} = require('./selectors/index.js');

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_LENGTH = 'array-length';
const MESSAGE_ID_ONLY_ELEMENT = 'only-element';
const MESSAGE_ID_SPREAD = 'spread';
const messages = {
	[MESSAGE_ID_ERROR]: 'Do not use `new Array()`.',
	[MESSAGE_ID_LENGTH]: 'The argument is the length of array.',
	[MESSAGE_ID_ONLY_ELEMENT]: 'The argument is the only element of array.',
	[MESSAGE_ID_SPREAD]: 'Spread the argument.'
};
const newArraySelector = newExpressionSelector({name: 'Array', length: 1, allowSpreadElement: true});

function getProblem(context, node) {
	const problem = {
		node,
		messageId: MESSAGE_ID_ERROR
	};

	const [argumentNode] = node.arguments;

	const sourceCode = context.getSourceCode();
	let text = sourceCode.getText(argumentNode);
	if (isParenthesized(argumentNode, sourceCode)) {
		text = `(${text})`;
	}

	const maybeSemiColon = needsSemicolon(sourceCode.getTokenBefore(node), sourceCode, '[') ?
		';' :
		'';

	// We are not sure how many `arguments` passed
	if (argumentNode.type === 'SpreadElement') {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_SPREAD,
				fix: fixer => fixer.replaceText(node, `${maybeSemiColon}[${text}]`)
			}
		];
		return problem;
	}

	const result = getStaticValue(argumentNode, context.getScope());
	const fromLengthText = `Array.from(${text === 'length' ? '{length}' : `{length: ${text}}`})`;
	const onlyElementText = `${maybeSemiColon}[${text}]`;

	// We don't know the argument is number or not
	if (result === null) {
		problem.suggest = [
			{
				messageId: MESSAGE_ID_LENGTH,
				fix: fixer => fixer.replaceText(node, fromLengthText)
			},
			{
				messageId: MESSAGE_ID_ONLY_ELEMENT,
				fix: fixer => fixer.replaceText(node, onlyElementText)
			}
		];
		return problem;
	}

	problem.fix = fixer => fixer.replaceText(
		node,
		typeof result.value === 'number' ? fromLengthText : onlyElementText
	);

	return problem;
}

const create = context => ({
	[newArraySelector](node) {
		return getProblem(context, node);
	}
});

module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow `new Array()`.'
		},
		fixable: 'code',
		messages,
		hasSuggestions: true
	}
};
