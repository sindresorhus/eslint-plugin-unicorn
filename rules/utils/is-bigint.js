import {isBigIntLiteral} from '../ast/index.js';
import {isFunctionCall, isStaticProperties} from './type-check.js';
import getStaticValueIfNoSideEffects from './get-static-value.js';
import {
	createTypeCheckers,
	hasJSDocumentTypeReference,
	target,
	unknown,
} from './type-helpers.js';

// `BigInt(…)`
const isBigIntCall = node => isFunctionCall(node, 'BigInt');

const bigIntMethods = new Set([
	'asIntN',
	'asUintN',
]);

// `BigInt.asIntN(…)` / `BigInt.asUintN(…)`
const isBigIntMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'BigInt', bigIntMethods);

const isBigIntTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSBigIntKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return isBigIntLiteral(node.literal);
		}

		default: {
			return false;
		}
	}
};

const getStaticType = value =>
	typeof value === 'bigint' ? target : unknown;

const bigIntBinaryOperators = new Set(['+', '-', '*', '/', '%', '**', '<<', '>>', '|', '^', '&']);

const isBigIntNode = (node, context, isTarget) =>
	isBigIntLiteral(node)
	|| isBigIntCall(node)
	|| isBigIntMethodCall(node)
	|| (node.type === 'UnaryExpression' && ['-', '~'].includes(node.operator) && isTarget(node.argument))
	|| (
		node.type === 'BinaryExpression'
		&& bigIntBinaryOperators.has(node.operator)
		&& isTarget(node.left)
		&& isTarget(node.right)
	)
	|| (node.type === 'UpdateExpression' && isTarget(node.argument));

const {
	isTarget: isBigIntTarget,
	isKnownNonTarget: isKnownNonBigInt,
} = createTypeCheckers({
	targetTypeNames: new Set(['bigint']),
	targetCallNames: ['BigInt'],
	isTargetNode: isBigIntNode,
	isTargetTypeAnnotation: isBigIntTypeAnnotation,
	// A bigint literal type like `1n` has no `intrinsicName`, its base type is `bigint`
	isTargetType: (type, checker) => checker.getBaseTypeOfLiteralType(type).intrinsicName === 'bigint',
	getStaticType,
});

export default function isBigInt(node, context, overrides) {
	if (
		node.type === 'TSSatisfiesExpression'
		&& isBigIntTypeAnnotation(node.typeAnnotation)
	) {
		return true;
	}

	if (isBigIntTarget(node, context, overrides)) {
		return true;
	}

	return typeof getStaticValueIfNoSideEffects(node, context)?.value === 'bigint'
		&& !hasJSDocumentTypeReference(node, context);
}

export {
	isKnownNonBigInt,
};
