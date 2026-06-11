import {isLiteral, isMethodCall, isNumericLiteral} from '../ast/index.js';
import {isSameReference} from '../utils/index.js';

const isOne = node => isLiteral(node, 1);

const isNonNegativeIntegerLiteral = node => (
	isNumericLiteral(node)
	&& Number.isSafeInteger(node.value)
	&& node.value >= 0
);

const getIndexFromPlusOne = (node, indexNode) => {
	if (
		node.type !== 'BinaryExpression'
		|| node.operator !== '+'
	) {
		return;
	}

	if (
		isSameReference(node.left, indexNode)
		&& isOne(node.right)
	) {
		return indexNode;
	}

	if (
		isOne(node.left)
		&& isSameReference(node.right, indexNode)
	) {
		return indexNode;
	}
};

const getIndexFromMinusOne = node => {
	if (
		node.type !== 'BinaryExpression'
		|| node.operator !== '-'
		|| !isOne(node.right)
	) {
		return;
	}

	return node.left;
};

export const getSubstringSingleCharacterIndex = node => {
	if (!isMethodCall(node, {
		method: 'substring',
		argumentsLength: 2,
	})) {
		return;
	}

	const [firstArgument, secondArgument] = node.arguments;

	if (
		isNonNegativeIntegerLiteral(firstArgument)
		&& isNonNegativeIntegerLiteral(secondArgument)
		&& Math.abs(firstArgument.value - secondArgument.value) === 1
	) {
		return firstArgument.value < secondArgument.value ? firstArgument : secondArgument;
	}

	const indexNode = getIndexFromMinusOne(firstArgument);
	return getIndexFromPlusOne(secondArgument, firstArgument)
		?? (getIndexFromPlusOne(firstArgument, secondArgument) ? secondArgument : undefined)
		?? (indexNode && isSameReference(indexNode, secondArgument) ? firstArgument : undefined);
};
