import {getStaticValue} from '@eslint-community/eslint-utils';
import {isFunctionCall} from './type-check.js';
import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

const comparisonOperators = new Set([
	'==',
	'!=',
	'===',
	'!==',
	'<',
	'<=',
	'>',
	'>=',
	'in',
	'instanceof',
]);

const isBooleanCall = node => isFunctionCall(node, 'Boolean');

const isBooleanTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBooleanTypeAnnotation(node.typeAnnotation);
		}

		case 'TSBooleanKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return node.literal.type === 'Literal' && typeof node.literal.value === 'boolean';
		}

		default: {
			return false;
		}
	}
};

const getStaticType = value =>
	typeof value === 'boolean' ? target : unknown;

const isBooleanNode = (node, context) => {
	if (
		isBooleanCall(node)
		|| (
			node.type === 'UnaryExpression'
			&& node.operator === '!'
		)
	) {
		return true;
	}

	if (node.type === 'BinaryExpression') {
		return comparisonOperators.has(node.operator);
	}

	if (node.type === 'LogicalExpression') {
		return isBoolean(node.left, context) && isBoolean(node.right, context);
	}

	return false;
};

const {
	isTarget: isBooleanTarget,
	isKnownNonTarget: isKnownNonBoolean,
} = createTypeCheckers({
	targetTypeNames: new Set(),
	targetCallNames: ['Boolean'],
	isTargetNode: isBooleanNode,
	isTargetTypeAnnotation: isBooleanTypeAnnotation,
	isTargetType: type => ['boolean', 'true', 'false'].includes(type.intrinsicName),
	getStaticType,
});

export default function isBoolean(node, context) {
	if (!node) {
		return false;
	}

	if (
		node.type === 'TSSatisfiesExpression'
		&& isBooleanTypeAnnotation(node.typeAnnotation)
	) {
		return true;
	}

	if (isBooleanTarget(node, context)) {
		return true;
	}

	return typeof getStaticValue(node, context.sourceCode.getScope(node))?.value === 'boolean';
}

export {
	isKnownNonBoolean,
};
