import {
	isCallExpression,
	isMethodCall,
	isNewExpression,
} from '../ast/index.js';
import {getStaticValueIfNoSideEffects, hasPotentiallyMutableMemberAccess, unwrapTypeScriptExpression} from '../utils/index.js';

const MAXIMUM_ARRAY_LENGTH = (2 ** 32) - 1;

const isValidArrayLength = value => (
	typeof value === 'number'
	&& Number.isSafeInteger(value)
	&& value >= 0
	&& value <= MAXIMUM_ARRAY_LENGTH
);

const hasInvalidStaticArrayLength = (node, context) => {
	const result = getStaticValueIfNoSideEffects(node, context);

	return Boolean(result
		? !isValidArrayLength(result.value)
		: hasPotentiallyMutableMemberAccess(node, context));
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
