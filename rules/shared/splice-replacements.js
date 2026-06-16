import {
	getStaticNumberValue,
	isSameReference,
} from '../utils/index.js';

const MESSAGE_ID_NO_OP = 'no-op';
const MESSAGE_ID_SHIFT = 'shift';
const MESSAGE_ID_UNSHIFT = 'unshift';
const MESSAGE_ID_POP = 'pop';
const MESSAGE_ID_PUSH = 'push';
const MESSAGE_ID_EMPTY = 'empty';

const emptyArrayReplacement = {
	messageId: MESSAGE_ID_EMPTY,
};

const isZero = node => Object.is(getStaticNumberValue(node), 0);
const isOne = node => getStaticNumberValue(node) === 1;
const isZeroOrNegative = node => getStaticNumberValue(node) <= 0;

const isLengthMemberExpressionFor = (node, object) =>
	node.type === 'MemberExpression'
	&& !node.optional
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
	&& !node.computed
	&& isSameReference(node.object, object);

const isLengthMinusOneFor = (node, object) =>
	node.type === 'BinaryExpression'
	&& node.operator === '-'
	&& isOne(node.right)
	&& isLengthMemberExpressionFor(node.left, object);

function getNoOpOrEmptyReplacement(arguments_, object) {
	if (arguments_.length === 0) {
		return {
			messageId: MESSAGE_ID_NO_OP,
		};
	}

	if (
		arguments_.length === 1
		&& isZero(arguments_[0])
	) {
		return emptyArrayReplacement;
	}

	if (
		arguments_.length === 2
		&& isZero(arguments_[0])
		&& isLengthMemberExpressionFor(arguments_[1], object)
	) {
		return emptyArrayReplacement;
	}

	if (
		arguments_.length === 2
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_NO_OP,
		};
	}
}

function getMethodReplacement(arguments_, object) {
	if (
		arguments_.length === 2
		&& isZero(arguments_[0])
		&& isOne(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_SHIFT,
			method: 'shift',
			argumentsToKeep: [],
		};
	}

	if (
		arguments_.length > 2
		&& isZero(arguments_[0])
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_UNSHIFT,
			method: 'unshift',
			argumentsToKeep: arguments_.slice(2),
		};
	}

	if (
		arguments_.length === 2
		&& isLengthMinusOneFor(arguments_[0], object)
		&& isOne(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_POP,
			method: 'pop',
			argumentsToKeep: [],
		};
	}

	if (
		arguments_.length > 2
		&& isLengthMemberExpressionFor(arguments_[0], object)
		&& isZeroOrNegative(arguments_[1])
	) {
		return {
			messageId: MESSAGE_ID_PUSH,
			method: 'push',
			argumentsToKeep: arguments_.slice(2),
		};
	}
}

function getUnnecessarySpliceReplacement(callExpression) {
	const {arguments: arguments_, callee} = callExpression;
	const {object} = callee;

	return getNoOpOrEmptyReplacement(arguments_, object) ?? getMethodReplacement(arguments_, object);
}

export {
	MESSAGE_ID_NO_OP,
	MESSAGE_ID_SHIFT,
	MESSAGE_ID_UNSHIFT,
	MESSAGE_ID_POP,
	MESSAGE_ID_PUSH,
	MESSAGE_ID_EMPTY,
	getUnnecessarySpliceReplacement,
};
