import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	hasOptionalChainElement,
	hasSameObjectShapePropertyCheck,
	isKnownNonCollectionLengthOrSize,
	isLengthOrSizeMemberExpression,
	unwrapTypeScriptExpression,
} from './utils/index.js';

const MESSAGE_ID = 'no-impossible-length-comparison';
const messages = {
	[MESSAGE_ID]: 'This comparison is always {{result}} because `.{{property}}` is always a non-negative integer.',
};

const flipOperator = {
	'<': '>',
	'<=': '>=',
	'>': '<',
	'>=': '<=',
	'===': '===',
	'!==': '!==',
	'==': '==',
	'!=': '!=',
};

function getComparisonSubject(node, context) {
	const left = unwrapTypeScriptExpression(node.left);
	const right = unwrapTypeScriptExpression(node.right);

	if (isLengthOrSizeMemberExpression(left)) {
		return {
			memberExpression: left,
			operator: node.operator,
			value: getStaticValue(right, context.sourceCode.getScope(right))?.value,
		};
	}

	if (isLengthOrSizeMemberExpression(right)) {
		return {
			memberExpression: right,
			operator: flipOperator[node.operator],
			value: getStaticValue(left, context.sourceCode.getScope(left))?.value,
		};
	}
}

function getConstantResult({operator, value}) {
	if (
		typeof value !== 'number'
		|| !Number.isFinite(value)
	) {
		return;
	}

	switch (operator) {
		case '<': {
			return value <= 0 ? false : undefined;
		}

		case '<=': {
			return value < 0 ? false : undefined;
		}

		case '>': {
			return value < 0 ? true : undefined;
		}

		case '>=': {
			return value <= 0 ? true : undefined;
		}

		case '===':
		case '==': {
			return value < 0 ? false : undefined;
		}

		case '!==':
		case '!=': {
			return value < 0 ? true : undefined;
		}

		default:
	}
}

function hasOptionalChain(node) {
	node = unwrapTypeScriptExpression(node);
	if (node.type === 'ChainExpression' || hasOptionalChainElement(node)) {
		return true;
	}

	if (node.type === 'MemberExpression') {
		return hasOptionalChain(node.object);
	}

	if (node.type === 'CallExpression') {
		return hasOptionalChain(node.callee);
	}

	return false;
}

function isOptionalChainReceiver(memberExpression) {
	return hasOptionalChain(memberExpression.object);
}

function isCustomClassReceiver(memberExpression) {
	const receiver = unwrapTypeScriptExpression(memberExpression.object);
	return receiver.type === 'ThisExpression' || receiver.type === 'Super';
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('BinaryExpression', node => {
		if (!Object.hasOwn(flipOperator, node.operator)) {
			return;
		}

		const comparison = getComparisonSubject(node, context);
		if (!comparison) {
			return;
		}

		const {memberExpression} = comparison;
		if (
			isCustomClassReceiver(memberExpression)
			|| isOptionalChainReceiver(memberExpression)
			|| isKnownNonCollectionLengthOrSize(memberExpression, context)
			|| hasSameObjectShapePropertyCheck({node, lengthOrSizeNode: memberExpression})
		) {
			return;
		}

		const result = getConstantResult(comparison);
		if (result === undefined) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				property: memberExpression.property.name,
				result: String(result),
			},
		};
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow impossible comparisons against `.length` or `.size`.',
			recommended: 'unopinionated',
		},
		messages,
		languages: [
			'js/js',
		],
	},
};

export default config;
