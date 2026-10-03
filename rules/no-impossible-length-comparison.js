import {
	hasOptionalChainElement,
	hasSameObjectShapePropertyCheck,
	isKnownNonCollectionLengthOrSize,
	isLengthOrSizeMemberExpression,
	getStaticValueForControlFlow,
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

const getStaticComparisonValue = (node, context) => getStaticValueForControlFlow(node, context)?.value;

function getComparisonSubject(node, context) {
	const left = unwrapTypeScriptExpression(node.left);
	const right = unwrapTypeScriptExpression(node.right);

	if (isLengthOrSizeMemberExpression(left)) {
		return {
			memberExpression: left,
			operator: node.operator,
			value: getStaticComparisonValue(right, context),
		};
	}

	if (isLengthOrSizeMemberExpression(right)) {
		return {
			memberExpression: right,
			operator: flipOperator[node.operator],
			value: getStaticComparisonValue(left, context),
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

		// Every operator in `flipOperator` has a case above.
		/* node:coverage ignore next */
		default:
	}
}

function isCustomClassReceiver(memberExpression) {
	const receiver = unwrapTypeScriptExpression(memberExpression.object);
	return receiver.type === 'ThisExpression' || receiver.type === 'Super';
}

/**
@param {import('eslint').Rule.RuleContext} context
*/
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
			|| hasOptionalChainElement(memberExpression.object)
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

/**
@type {import('eslint').Rule.RuleModule}
*/
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
