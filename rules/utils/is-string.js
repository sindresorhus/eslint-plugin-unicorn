import {getStaticValue} from '@eslint-community/eslint-utils';
import {isStringLiteral} from '../ast/index.js';
import {isFunctionCall, isStaticProperties} from './type-check.js';
import {
	createTypeCheckers,
	target,
	unknown,
} from './type-helpers.js';

// `String(…)`
const isStringCall = node => isFunctionCall(node, 'String');

const stringMethods = new Set([
	'fromCharCode',
	'fromCodePoint',
]);

// `String.fromCharCode(…)` / `String.fromCodePoint(…)`
const isStringMethodCall = node =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isStaticProperties(node.callee, 'String', stringMethods);

const isStringTypeAnnotation = node => {
	switch (node?.type) {
		case 'TSTypeAnnotation':
		case 'TSParenthesizedType': {
			return isStringTypeAnnotation(node.typeAnnotation);
		}

		case 'TSStringKeyword': {
			return true;
		}

		case 'TSLiteralType': {
			return isStringLiteral(node.literal);
		}

		default: {
			return false;
		}
	}
};

const getStaticType = value =>
	typeof value === 'string' ? target : unknown;

const isStringNode = (node, context) => {
	if (
		isStringLiteral(node)
		|| isStringCall(node)
		|| isStringMethodCall(node)
	) {
		return true;
	}

	switch (node.type) {
		case 'TemplateLiteral': {
			return true;
		}

		case 'UnaryExpression': {
			return node.operator === 'typeof';
		}

		case 'BinaryExpression': {
			return node.operator === '+'
				&& (isString(node.left, context) || isString(node.right, context));
		}

		case 'AssignmentExpression': {
			if (node.operator === '=') {
				return isString(node.right, context);
			}

			return node.operator === '+='
				&& (isString(node.left, context) || isString(node.right, context));
		}

		default: {
			return false;
		}
	}
};

const {
	isTarget: isStringTarget,
	isKnownNonTarget: isKnownNonString,
} = createTypeCheckers({
	targetTypeNames: new Set(),
	targetCallNames: ['String'],
	isTargetNode: isStringNode,
	isTargetTypeAnnotation: isStringTypeAnnotation,
	isTargetType: type => type.isStringLiteral?.() || type.intrinsicName === 'string',
	getStaticType,
});

export default function isString(node, context) {
	if (!node) {
		return false;
	}

	if (
		node.type === 'TSSatisfiesExpression'
		&& isStringTypeAnnotation(node.typeAnnotation)
	) {
		return true;
	}

	if (isStringTarget(node, context)) {
		return true;
	}

	return typeof getStaticValue(node, context.sourceCode.getScope(node))?.value === 'string';
}

export {
	isKnownNonString,
};
