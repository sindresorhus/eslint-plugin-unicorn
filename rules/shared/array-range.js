import {getStaticValue} from '@eslint-community/eslint-utils';
import {
	isCallExpression,
	isMethodCall,
	isNewExpression,
} from '../ast/index.js';
import {unwrapTypeScriptExpression} from '../utils/index.js';

const MAXIMUM_ARRAY_LENGTH = (2 ** 32) - 1;

const isValidArrayLength = value => (
	typeof value === 'number'
	&& Number.isSafeInteger(value)
	&& value >= 0
	&& value <= MAXIMUM_ARRAY_LENGTH
);

const hasInvalidStaticArrayLength = (node, context) => {
	const result = getStaticValue(node, context.sourceCode.getScope(node));

	return result ? !isValidArrayLength(result.value) : false;
};

const isArrayConstructorWithOneArgument = (node, context) => (
	(
		isCallExpression(node, {
			name: 'Array',
			argumentsLength: 1,
			optional: false,
		})
		|| isNewExpression(node, {
			name: 'Array',
			argumentsLength: 1,
		})
	)
	&& context.sourceCode.isGlobalReference(node.callee)
);

const getArrayRangeLength = (node, context) => {
	node = unwrapTypeScriptExpression(node);

	if (
		!isMethodCall(node, {
			method: 'keys',
			argumentsLength: 0,
			optionalCall: false,
			optionalMember: false,
		})
	) {
		return;
	}

	const receiver = unwrapTypeScriptExpression(node.callee.object);
	if (!isArrayConstructorWithOneArgument(receiver, context)) {
		return;
	}

	const [length] = receiver.arguments;
	if (hasInvalidStaticArrayLength(length, context)) {
		return;
	}

	return length;
};

export {getArrayRangeLength};
