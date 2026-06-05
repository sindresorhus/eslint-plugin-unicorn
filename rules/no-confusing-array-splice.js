import {isMethodCall, isNumericLiteral} from './ast/index.js';

const REPLACE_ONE_ELEMENT = 'replace-one-element';
const INSERT_AT_NEGATIVE_ONE = 'insert-at-negative-one';
const messages = {
	[REPLACE_ONE_ELEMENT]: 'Prefer a direct element replacement instead of `{{method}}()`.',
	[INSERT_AT_NEGATIVE_ONE]: 'Avoid using `{{method}}()` to insert at `-1`.',
};

function getStaticNumberValue(node) {
	if (
		node.type === 'TSAsExpression'
		|| node.type === 'TSTypeAssertion'
		|| node.type === 'TSNonNullExpression'
	) {
		return getStaticNumberValue(node.expression);
	}

	if (isNumericLiteral(node)) {
		return node.value;
	}

	if (
		node.type === 'UnaryExpression'
		&& (node.operator === '+' || node.operator === '-')
		&& isNumericLiteral(node.argument)
	) {
		return node.operator === '-' ? -node.argument.value : node.argument.value;
	}
}

function getMessageId([start, deleteCount]) {
	const deleteCountValue = getStaticNumberValue(deleteCount);

	if (deleteCountValue === 1) {
		return REPLACE_ONE_ELEMENT;
	}

	const startValue = getStaticNumberValue(start);

	if (
		startValue === -1
		&& deleteCountValue === 0
	) {
		return INSERT_AT_NEGATIVE_ONE;
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', callExpression => {
		if (!isMethodCall(callExpression, {
			methods: ['splice', 'toSpliced'],
			argumentsLength: 3,
			optionalCall: false,
			optionalMember: false,
		})) {
			return;
		}

		const messageId = getMessageId(callExpression.arguments);
		if (!messageId) {
			return;
		}

		return {
			node: callExpression.callee.property,
			messageId,
			data: {
				method: callExpression.callee.property.name,
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow confusing uses of `Array#{splice,toSpliced}()`.',
			recommended: true,
		},
		messages,
	},
};

export default config;
