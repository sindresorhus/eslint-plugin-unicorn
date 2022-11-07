'use strict';
const {
	memberExpressionSelector,
	newExpressionSelector,
} = require('./selectors/index.js');
const { fixSpaceAroundKeyword } = require('./fix/index.js');
const { findVariable } = require('eslint-utils');

const MESSAGE_ID = 'prefer-set-size';
const messages = {
	[MESSAGE_ID]: 'Prefer use `Set#size`.'
}

const lengthAccessSelector = [
	memberExpressionSelector('length'),
	'[object.type="ArrayExpression"]',
	'[object.elements.length=1]',
	'[object.elements.0.type="SpreadElement"]',
].join('');

const isNewSet = node =>
	node?.type === 'NewExpression'
	&& node.callee.type === 'Identifier'
	&& node.callee.name === 'Set';

function isSet(node, scope) {
	if (isNewSet(node)) {
		return true;
	}


	if (node.type !== 'Identifier') {
		return false;
	}

	const variable = findVariable(scope, node);

	if (!variable || variable.defs.length !== 1) {
		return false;
	}

	const [definition] = variable.defs;

	if (definition.type !== 'Variable' || definition.kind !== 'const') {
		return false;
	}

	const declarator = definition.node;
	return declarator.type === 'VariableDeclarator'
		&& declarator.id.type === 'Identifier'
		&& isNewSet(definition.node.init)
}


// `[...set].length` -> `set.size`
function fix(sourceCode, lengthAccessNodes) {
	const {
		object: arrayExpression,
		property
	} = lengthAccessNodes;
	const set = arrayExpression.elements[0].argument;

	if (sourceCode.getCommentsInside(arrayExpression).length > sourceCode.getCommentsInside(set).length) {
		return;
	}

	/** @param {import('eslint').Rule.RuleFixer} fixer */
	return function * (fixer) {
		yield fixer.replaceText(property, 'size');
		yield fixer.replaceText(arrayExpression, sourceCode.getText(set));
		yield * fixSpaceAroundKeyword(fixer, lengthAccessNodes, sourceCode)
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const sourceCode = context.getSourceCode();

	return {
		[lengthAccessSelector](node) {
			const maybeSet = node.object.elements[0].argument;
			if (!isSet(maybeSet, context.getScope())) {
				return;
			}

			return {
				node: node.property,
				messageId: MESSAGE_ID,
				fix: fix(sourceCode, node),
			}
		}
	};
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer use `Set#size` instead of `Array#length`.',
		},
		fixable: 'code',
		messages,
	},
};
