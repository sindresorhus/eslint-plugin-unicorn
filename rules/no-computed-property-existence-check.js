import {
	getParenthesizedText,
	hasOptionalChainElement,
	isBoolean,
	isBooleanExpression,
	isControlFlowTest,
	wouldRemoveComments,
} from './utils/index.js';

const MESSAGE_ID = 'no-computed-property-existence-check/error';
const MESSAGE_ID_SUGGESTION = 'no-computed-property-existence-check/suggestion';
const messages = {
	[MESSAGE_ID]: 'Do not use a dynamic object property existence check.',
	[MESSAGE_ID_SUGGESTION]: 'Use `Object.hasOwn()`.',
};

const transparentExpressionTypes = new Set([
	'ChainExpression',
	'TSAsExpression',
	'TSSatisfiesExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
]);

function unwrapTransparentExpression(node) {
	while (
		transparentExpressionTypes.has(node.type)
	) {
		node = node.expression;
	}

	return node;
}

function getTransparentExpressionAncestor(node) {
	while (
		transparentExpressionTypes.has(node.parent?.type)
		&& node.parent.expression === node
	) {
		node = node.parent;
	}

	return node;
}

function isStaticPropertyKey(node) {
	node = unwrapTransparentExpression(node);

	return node.type === 'Literal'
		|| node.type === 'PrivateIdentifier'
		|| (
			node.type === 'TemplateLiteral'
			&& node.expressions.length === 0
		)
		|| (
			node.type === 'UnaryExpression'
			&& (node.operator === '-' || node.operator === '+')
			&& node.argument.type === 'Literal'
			&& (typeof node.argument.value === 'number' || typeof node.argument.value === 'bigint')
		);
}

function isUsedAsExistenceCheck(node, context) {
	node = getTransparentExpressionAncestor(node);
	return isBooleanExpression(node, context) || isControlFlowTest(node);
}

function isSimpleInSuggestionOperand(node) {
	return node.type === 'Identifier' || node.type === 'ThisExpression';
}

function getExpressionText(node, context) {
	const text = getParenthesizedText(node, context);
	return node.type === 'SequenceExpression' ? `(${text})` : text;
}

function getObjectHasOwnText(object, property, context) {
	return `Object.hasOwn(${getExpressionText(object, context)}, ${getExpressionText(property, context)})`;
}

function hasLeadingComments(node, context) {
	return context.sourceCode.getCommentsBefore(node).length > 0;
}

function getSuggestion(node, object, property, context) {
	if (
		object.type === 'Super'
		|| object.type === 'ChainExpression'
		|| property.type === 'ChainExpression'
		|| getTransparentExpressionAncestor(node) !== node
		|| hasOptionalChainElement(node)
		|| hasOptionalChainElement(object)
		|| hasOptionalChainElement(property)
		|| (
			node.type === 'BinaryExpression'
			&& (!isSimpleInSuggestionOperand(object) || !isSimpleInSuggestionOperand(property))
		)
		|| hasLeadingComments(object, context)
		|| hasLeadingComments(property, context)
		|| wouldRemoveComments(context, node, [object, property])
	) {
		return;
	}

	return [
		{
			messageId: MESSAGE_ID_SUGGESTION,
			fix: fixer => fixer.replaceText(node, getObjectHasOwnText(object, property, context)),
		},
	];
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('MemberExpression', node => {
		if (!(
			node.computed
			&& !isStaticPropertyKey(node.property)
			&& isUsedAsExistenceCheck(node, context)
		)) {
			return;
		}

		// A property whose value type is a known boolean is a value read, not an existence check (and `no-unnecessary-boolean-comparison` may rewrite a comparison into this form).
		if (isBoolean(node, context)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: getSuggestion(node, node.object, node.property, context),
		};
	});

	context.on('BinaryExpression', node => {
		if (!(
			node.operator === 'in'
			&& !isStaticPropertyKey(node.left)
		)) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			suggest: getSuggestion(node, node.right, node.left, context),
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow dynamic object property existence checks.',
			recommended: true,
		},
		hasSuggestions: true,
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
