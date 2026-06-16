import {getStaticValue} from '@eslint-community/eslint-utils';
import {isBigIntLiteral} from '../ast/index.js';
import {isFunctionCall, isStaticProperties} from './type-check.js';
import {
	createTypeCheckers,
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
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isBigIntTypeAnnotation(node.typeAnnotation);
		}

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

const isBigIntNode = node =>
	isBigIntLiteral(node)
	|| isBigIntCall(node)
	|| isBigIntMethodCall(node);

const {
	isTarget: isBigIntTarget,
	isKnownNonTarget: isKnownNonBigInt,
} = createTypeCheckers({
	targetTypeNames: new Set(),
	targetCallNames: ['BigInt'],
	isTargetNode: isBigIntNode,
	isTargetTypeAnnotation: isBigIntTypeAnnotation,
	isTargetType: type => type.isBigIntLiteral?.() || type.intrinsicName === 'bigint',
	getStaticType,
});

export default function isBigInt(node, context) {
	if (!node) {
		return false;
	}

	if (
		node.type === 'TSSatisfiesExpression'
		&& isBigIntTypeAnnotation(node.typeAnnotation)
	) {
		return true;
	}

	if (isBigIntTarget(node, context)) {
		return true;
	}

	return typeof getStaticValue(node, context.sourceCode.getScope(node))?.value === 'bigint';
}

export {
	isKnownNonBigInt,
};
