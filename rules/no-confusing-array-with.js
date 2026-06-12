import {isMethodCall, isNumericLiteral} from './ast/index.js';
import {isSameReference} from './utils/index.js';

const MESSAGE_ID_NEGATIVE_INDEX = 'negative-index';
const MESSAGE_ID_LENGTH_INDEX = 'length-index';

const messages = {
	[MESSAGE_ID_NEGATIVE_INDEX]: 'Avoid using a negative index with `Array#with()`.',
	[MESSAGE_ID_LENGTH_INDEX]: 'Avoid using `.length` as the index in `Array#with()`.',
};

const typeScriptExpressionWrapperTypes = new Set([
	'TSAsExpression',
	'TSTypeAssertion',
	'TSNonNullExpression',
	'TSSatisfiesExpression',
]);

/**
@import * as ESLint from 'eslint';
*/

function getStaticNumberValue(node) {
	if (typeScriptExpressionWrapperTypes.has(node.type)) {
		return getStaticNumberValue(node.expression);
	}

	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'UnaryExpression'
		&& (node.operator === '+' || node.operator === '-')
	) {
		const value = getStaticNumberValue(node.argument);

		if (typeof value === 'number') {
			return node.operator === '-' ? -value : value;
		}
	}
}

const unwrapTypeScriptExpression = node =>
	typeScriptExpressionWrapperTypes.has(node.type)
		? unwrapTypeScriptExpression(node.expression)
		: node;

const isNegativeStaticNumber = node => getStaticNumberValue(node) < 0;

function isLengthMemberExpressionFor(node, object) {
	node = unwrapTypeScriptExpression(node);
	object = unwrapTypeScriptExpression(object);

	return node.type === 'MemberExpression'
		&& !node.optional
		&& !node.computed
		&& node.property.type === 'Identifier'
		&& node.property.name === 'length'
		&& isSameReference(unwrapTypeScriptExpression(node.object), object);
}

function getMessageId(indexNode, object) {
	if (isNegativeStaticNumber(indexNode)) {
		return MESSAGE_ID_NEGATIVE_INDEX;
	}

	if (isLengthMemberExpressionFor(indexNode, object)) {
		return MESSAGE_ID_LENGTH_INDEX;
	}
}

/** @param {ESLint.Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			method: 'with',
			argumentsLength: 2,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const {object} = callExpression.callee;
		const [indexNode] = callExpression.arguments;
		const messageId = getMessageId(indexNode, object);

		if (!messageId) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId,
		};
	});
};

/** @type {ESLint.Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow confusing uses of `Array#with()`.',
			recommended: true,
		},
		schema: [],
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
